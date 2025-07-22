import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertMealSchema, insertWeekSchema, insertOrderSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from 'memorystore';
import ConnectPgSimple from 'connect-pg-simple';
import { pool } from "./db";
import { getPriceForMealCount, Admin } from "@shared/schema";
import multer from "multer";
import { sendEmail } from "./sendgrid";
import path from "path";
import fs from "fs";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    adminId?: number;
    tempMealSelections?: {
      weekId: number;
      mealCount: number;
      portionSize: string;
      selectedMeals: any[];
      deliverySlot?: string;
    };
  }
}

// Extend Request interface to include admin
declare module 'express-serve-static-core' {
  interface Request {
    admin?: Admin;
  }
}

// Helper function to calculate pricing for orders
function calculateOrderPricing(mealCount: number, defaultPortionSize: string): { subtotal: number; discount: number; total: number } {
  const pricePerMeal = getPriceForMealCount(mealCount);
  const largePortionAdditional = 99;
  
  let subtotal = 0;
  
  if (defaultPortionSize === 'large') {
    subtotal = (pricePerMeal + largePortionAdditional) * mealCount;
  } else if (defaultPortionSize === 'standard') {
    subtotal = pricePerMeal * mealCount;
  } else if (defaultPortionSize === 'mixed') {
    // For mixed, use standard price as base (user will adjust portions later)
    subtotal = pricePerMeal * mealCount;
  }
  
  // Calculate discount based on full price
  const fullPriceTotal = mealCount * 249;
  const discount = Math.max(0, fullPriceTotal - subtotal);
  
  return { subtotal, discount, total: subtotal };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });

  // Session setup with production warning
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    console.warn('SESSION_SECRET not set in production - please configure this in your deployment settings for security');
  }
  
  // Configure session store - use PostgreSQL in all environments
  let sessionStore;
  
  try {
    // Try to use PostgreSQL session store
    const PgSession = ConnectPgSimple(session);
    sessionStore = new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
      ttl: 24 * 60 * 60, // 24 hours in seconds
      errorLog: (error: Error) => {
        console.error('Session store error:', error);
      }
    });
    console.log('Using PostgreSQL session store');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL session store:', error);
    // Fallback to memory store only if PostgreSQL fails
    const SessionStore = MemoryStore(session);
    sessionStore = new SessionStore({
      checkPeriod: 86400000,
      max: 10000,
      ttl: 86400000
    });
    console.log('Fallback: Using memory store');
  }
  
  console.log('Session store type:', sessionStore.constructor.name);

  // Production-optimized session configuration
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('=== SESSION CONFIGURATION DEBUG ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Session secret source:', sessionSecret ? 'provided' : 'default');
  console.log('Session store type:', sessionStore.constructor.name);
  console.log('Secure cookies enabled:', isProduction);
  console.log('====================================');

  // Production-ready session configuration
  const sessionOptions = {
    secret: sessionSecret || 'wagba-secret-key-development-only',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: { 
      secure: isProduction, // Use secure cookies in production
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax' as const
    },
    store: sessionStore,
    name: 'wagba_session'
  };
  
  console.log('EMERGENCY SESSION CONFIG: Memory store with relaxed cookie settings');

  // Standard CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    next();
  });

  app.use(session(sessionOptions));

  // Enhanced authentication middleware with token fallback
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
    console.log('Auth middleware check:', {
      sessionId: req.sessionID,
      userId: req.session.userId,
      sessionExists: !!req.session,
      cookieExists: !!req.headers.cookie,
      tokenCookie: !!req.cookies.wagba_auth_token
    });
    
    // First try session-based auth
    if (req.session.userId) {
      console.log('Session auth successful for user:', req.session.userId);
      return next();
    }
    
    // Fallback to token-based auth (cookie or header)
    const cookieToken = req.cookies.wagba_auth_token;
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = headerToken || cookieToken;
    
    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [userId, timestamp, email] = decoded.split(':');
        
        if (userId && email) {
          // Verify user still exists
          const user = await storage.getUser(parseInt(userId));
          if (user && user.email === email) {
            console.log('Token auth successful for user:', userId, 'via', headerToken ? 'header' : 'cookie');
            // Set session for future requests
            req.session.userId = parseInt(userId);
            return next();
          }
        }
      } catch (error) {
        console.log('Token auth failed:', String(error));
      }
    }
    
    console.log('Authentication failed: No valid session or token');
    return res.status(401).json({ message: 'Unauthorized' });
  };

  // Enhanced admin middleware with token fallback
  const adminMiddleware = async (req: Request, res: Response, next: Function) => {

    
    // Check session first
    let adminId = req.session.adminId;
    
    // If no session, try token authentication
    if (!adminId) {
      const cookieToken = req.cookies.wagba_admin_token;
      const headerToken = req.headers.authorization?.replace('Bearer ', '');
      const token = headerToken || cookieToken;
      
      if (token) {
        try {
          const decoded = Buffer.from(token, 'base64').toString();
          const [type, tokenAdminId, timestamp, email] = decoded.split(':');
          
          if (type === 'admin' && tokenAdminId && email) {
            const admin = await storage.getAdmin(parseInt(tokenAdminId));
            if (admin && admin.email === email) {
              adminId = parseInt(tokenAdminId);
              // Set session for future requests
              req.session.adminId = adminId;
            }
          }
        } catch (error) {
          console.log('Admin token auth failed:', String(error));
        }
      }
    }

    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    }

    const admin = await storage.getAdmin(adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden - Invalid admin session' });
    }

    // Add admin to request for role checking
    req.admin = admin;
    next();
  };

  // Super admin middleware - requires super_admin role
  const superAdminMiddleware = async (req: Request, res: Response, next: Function) => {
    // First run admin middleware to authenticate
    await new Promise<void>((resolve, reject) => {
      adminMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(() => {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    });

    // Check if admin has super_admin role
    const admin = req.admin;
    if (!admin || admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden - Super admin access required' });
    }

    next();
  };

  // Temporary meal selection storage for onboarding
  app.post('/api/temp/meal-selections', async (req, res) => {
    try {
      const { weekId, mealCount, portionSize, selectedMeals, deliverySlot } = req.body;
      
      if (!weekId || !mealCount || !selectedMeals) {
        return res.status(400).json({ message: 'Missing required meal selection data' });
      }

      // Store in session for reliable cross-page persistence
      req.session.tempMealSelections = {
        weekId,
        mealCount,
        portionSize,
        selectedMeals,
        deliverySlot
      };

      res.json({ message: 'Meal selections stored successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/temp/meal-selections', async (req, res) => {
    try {
      const selections = req.session.tempMealSelections;
      if (!selections) {
        return res.status(404).json(null);
      }
      res.json(selections);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Set session
      req.session.userId = user.id;

      // BACKUP: Create user token as fallback for immediate authentication
      const userToken = Buffer.from(`${user.id}:${Date.now()}:${user.email}`).toString('base64');
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('User session save error:', err);
        }
      });

      // Set user token cookie as backup
      res.cookie('wagba_auth_token', userToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Check if there are temporary meal selections to create an order
      if (req.session.tempMealSelections) {
        try {
          const selections = req.session.tempMealSelections;
          
          // Calculate pricing for the order
          const pricePerMeal = getPriceForMealCount(selections.mealCount);
          const largePortionAdditional = 99;
          
          let subtotal = 0;
          for (const mealItem of selections.selectedMeals) {
            const basePrice = pricePerMeal;
            const itemPrice = mealItem.portionSize === "large" ? basePrice + largePortionAdditional : basePrice;
            subtotal += itemPrice;
          }
          
          const fullPriceTotal = selections.mealCount * 249;
          const discount = fullPriceTotal - subtotal;
          const total = subtotal;

          // Auto-skip all weeks before the selected first delivery week for new users
          await autoSkipPrecedingWeeks(user.id, selections.weekId);

          // Create the order using the temporarily stored selections
          const order = await storage.createOrder({
            userId: user.id,
            weekId: selections.weekId,
            mealCount: selections.mealCount,
            defaultPortionSize: selections.portionSize,
            deliverySlot: selections.deliverySlot || 'morning',
            subtotal,
            discount,
            total
          });

          // Add the meal items to the order
          for (const mealItem of selections.selectedMeals) {
            const basePrice = pricePerMeal;
            const itemPrice = mealItem.portionSize === "large" ? basePrice + largePortionAdditional : basePrice;
            
            await storage.addOrderItem({
              orderId: order.id,
              mealId: mealItem.mealId,
              portionSize: mealItem.portionSize,
              price: itemPrice
            });
          }

          // Clear the temporary selections
          delete req.session.tempMealSelections;
        } catch (orderError) {
          console.error('Error creating order during registration:', orderError);
          // Don't fail registration if order creation fails
        }
      }

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        token: userToken
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Set session
      req.session.userId = user.id;

      // BACKUP: Create a simple token as fallback
      const token = Buffer.from(`${user.id}:${Date.now()}:${user.email}`).toString('base64');
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
      });

      // Set token cookie as backup
      res.cookie('wagba_auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        token: token
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      // Clear token cookie as well
      res.clearCookie('wagba_auth_token');
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security reasons, still return success even if email doesn't exist
        return res.json({ message: 'Password reset instructions sent if email exists' });
      }

      // In a real application, we would generate a token and send an email with reset instructions
      // For this demo, we'll just return a success message

      res.json({ message: 'Password reset instructions sent if email exists' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      // Check session first
      let userId = req.session.userId;
      
      // If no session, try token authentication
      if (!userId) {
        const cookieToken = req.cookies.wagba_auth_token;
        const headerToken = req.headers.authorization?.replace('Bearer ', '');
        const token = headerToken || cookieToken;
        
        if (token) {
          try {
            const decoded = Buffer.from(token, 'base64').toString();
            const [tokenUserId, timestamp, email] = decoded.split(':');
            
            if (tokenUserId && email) {
              const user = await storage.getUser(parseInt(tokenUserId));
              if (user && user.email === email) {
                userId = parseInt(tokenUserId);
                // Set session for future requests
                req.session.userId = userId;
              }
            }
          } catch (error) {
            console.log('Token decode error in /api/auth/me:', String(error));
          }
        }
      }

      if (!userId) {
        return res.status(401).json(null);
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json(null);
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin Auth Routes
  app.post('/api/admin/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.adminId = admin.id;

      // BACKUP: Create admin token as fallback
      const adminToken = Buffer.from(`admin:${admin.id}:${Date.now()}:${admin.email}`).toString('base64');
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('Admin session save error:', err);
        }
      });

      // Set admin token cookie as backup
      res.cookie('wagba_admin_token', adminToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        token: adminToken
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });



  app.post('/api/admin/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      // Clear admin token cookie as well
      res.clearCookie('wagba_admin_token');
      res.json({ message: 'Logged out successfully' });
    });
  });

  // User Routes
  app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        address: user?.address,
        hasUsedTrialBox: user?.hasUsedTrialBox || false,
        userType: user?.userType || 'trial'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const { name, email, phone, address } = req.body;

      const updatedUser = await storage.updateUser(req.session.userId!, {
        name,
        email,
        phone,
        address
      });

      res.json({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User subscription management routes
  app.post('/api/user/subscription/cancel', authMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user session' });
      }
      const updatedUser = await storage.cancelUserSubscription(userId);
      
      res.json({ 
        message: 'Subscription cancelled successfully',
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionCancelledAt: updatedUser.subscriptionCancelledAt
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/user/subscription/resume', authMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user session' });
      }
      const updatedUser = await storage.resumeUserSubscription(userId);
      
      res.json({ 
        message: 'Subscription resumed successfully',
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionCancelledAt: updatedUser.subscriptionCancelledAt
      });
    } catch (error) {
      console.error('Error resuming subscription:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Start subscription (mock implementation)
  app.post('/api/user/start-subscription', authMiddleware, async (req, res) => {
    try {
      const { paymentMethod, mockPayment } = req.body;
      
      console.log('Starting subscription for user:', req.session.userId);
      console.log('Payment method:', paymentMethod);
      
      // In a real implementation, this would process the payment with Stripe
      // For now, we'll just update the user to be a subscriber
      
      const user = await storage.updateUser(req.session.userId!, {
        userType: 'subscriber',
        subscriptionStartedAt: new Date()
      });
      
      console.log('User updated successfully:', user.id);
      
      // Resume subscription if it was cancelled
      await storage.resumeUserSubscription(req.session.userId!);
      
      console.log('Subscription resumed successfully');
      
      res.json({ 
        message: 'Subscription started successfully', 
        user,
        paymentMethod 
      });
    } catch (error) {
      console.error('Error starting subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      res.status(500).json({ message: 'Server error: ' + errorMessage });
    }
  });

  app.get('/api/user/subscription/status', authMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - No user session' });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        subscriptionStatus: user.subscriptionStatus || 'active',
        subscriptionCancelledAt: user.subscriptionCancelledAt,
        subscriptionPausedAt: user.subscriptionPausedAt
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Helper function to generate future weeks
  const generateFutureWeeks = async () => {
    const weeks = await storage.getWeeks();
    const now = new Date();

    // Find the latest week in the database
    const latestWeek = weeks.reduce((latest, week) => {
      const weekDelivery = new Date(week.deliveryDate);
      const latestDelivery = new Date(latest.deliveryDate);
      return weekDelivery > latestDelivery ? week : latest;
    }, weeks[0]);

    if (!latestWeek) return;

    const latestDeliveryDate = new Date(latestWeek.deliveryDate);
    const weeksToGenerate = [];

    // Generate weeks until we have at least 6 weeks into the future
    let currentDate = new Date(latestDeliveryDate);
    let weekNumber = weeks.length + 1;

    while (currentDate <= new Date(now.getTime() + (6 * 7 * 24 * 60 * 60 * 1000))) {
      currentDate.setDate(currentDate.getDate() + 7);

      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 6);

      // Order deadline is 3 days before delivery
      const orderDeadline = new Date(currentDate);
      orderDeadline.setDate(orderDeadline.getDate() - 3);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startMonth = monthNames[startDate.getMonth()];
      const endMonth = monthNames[endDate.getMonth()];
      const year = startDate.getFullYear();

      let label;
      if (startMonth === endMonth) {
        label = `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
      } else {
        label = `${startMonth} ${startDate.getDate()}-${endMonth} ${endDate.getDate()}, ${year}`;
      }

      weeksToGenerate.push({
        identifier: `week${weekNumber}`,
        label,
        startDate: startDate,
        endDate: endDate,
        orderDeadline: orderDeadline,
        deliveryDate: currentDate,
        isActive: true,
        isSelectable: true
      });

      weekNumber++;
    }

    // Insert the new weeks and assign meals to them
    for (const weekData of weeksToGenerate) {
      try {
        const newWeek = await storage.createWeek(weekData);

        // Get meals from week 1 (template week) and assign them to the new week
        const templateWeekMeals = await storage.getWeekMeals(1);
        for (const templateMeal of templateWeekMeals) {
          await storage.addMealToWeek({
            weekId: newWeek.id,
            mealId: templateMeal.mealId,
            isAvailable: templateMeal.isAvailable,
            isFeatured: templateMeal.isFeatured,
            sortOrder: templateMeal.sortOrder
          });
        }
      } catch (error) {
        console.error('Error creating week or assigning meals:', error);
      }
    }
  };

  // Weeks Routes
  app.get('/api/weeks', async (req, res) => {
    try {
      // Generate future weeks if needed
      await generateFutureWeeks();

      const weeks = await storage.getWeeks();
      res.json({ weeks });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/weeks/current', async (req, res) => {
    try {
      const currentWeek = await storage.getCurrentWeek();
      if (!currentWeek) {
        return res.status(404).json({ message: 'No current week found' });
      }
      res.json(currentWeek);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/weeks/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid week ID' });
      }

      const week = await storage.getWeek(id);
      if (!week) {
        return res.status(404).json({ message: 'Week not found' });
      }

      res.json(week);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/weeks', adminMiddleware, async (req, res) => {
    try {
      const weekData = insertWeekSchema.parse(req.body);
      const week = await storage.createWeek(weekData);
      res.status(201).json(week);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid week data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/weeks/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const weekData = req.body;
      const week = await storage.updateWeek(id, weekData);
      res.json(week);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Menu Routes

  // Get all meals
  app.get('/api/meals', async (req, res) => {
    try {
      const meals = await storage.getAllMeals();
      res.json({ meals });
    } catch (error) {
      console.error("Error fetching all meals:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/menu/:weekId', async (req, res) => {
    try {
      const weekId = req.params.weekId;
      let meals;

      if (weekId === 'current') {
        const currentWeek = await storage.getCurrentWeek();
        if (!currentWeek) {
          return res.status(404).json({ message: 'No current week found' });
        }
        meals = await storage.getMealsByWeek(currentWeek.id);
      } else {
        const weekIdNum = parseInt(weekId);
        meals = await storage.getMealsByWeek(weekIdNum);
      }

      res.json({ meals });
    } catch (error) {
      console.error("Error fetching meals for week:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/meals', adminMiddleware, async (req, res) => {
    try {
      const mealData = insertMealSchema.parse(req.body);
      const meal = await storage.createMeal(mealData);
      res.status(201).json(meal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid meal data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/meals/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mealData = req.body;
      const meal = await storage.updateMeal(id, mealData);
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/meals/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeal(id);
      res.json({ message: 'Meal deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/weeks/:weekId/meals', adminMiddleware, async (req, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const { mealId, isAvailable, isFeatured, sortOrder } = req.body;

      const weekMeal = await storage.addMealToWeek({
        weekId,
        mealId,
        isAvailable,
        isFeatured,
        sortOrder
      });

      res.status(201).json(weekMeal);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/weeks/:weekId/meals/:mealId', adminMiddleware, async (req, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const mealId = parseInt(req.params.mealId);

      await storage.removeMealFromWeek(weekId, mealId);
      res.json({ message: 'Meal removed from week successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get meals for a specific week
  app.get('/api/menu/:weekId', authMiddleware, async (req, res) => {
    try {
      const weekId = parseInt(req.params.weekId);

      // Get meals for the specific week
      const meals = await storage.getMealsByWeek(weekId);

      res.json({ meals });
    } catch (error) {
      console.error('Error fetching meals for week:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Order Routes
  app.get('/api/orders', authMiddleware, async (req, res) => {
    try {
      const orders = await storage.getOrdersByUser(req.session.userId!);
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/orders', authMiddleware, async (req, res) => {
    try {
      const { weekId, mealCount, defaultPortionSize, items, totalPrice, deliverySlot } = req.body;

      // Create the order
      const order = await storage.createOrder({
        userId: req.session.userId!,
        weekId,
        status: 'selected',
        mealCount,
        defaultPortionSize: defaultPortionSize || 'standard',
        subtotal: totalPrice || 0,
        discount: 0,
        total: totalPrice || 0,
        deliveryDate: new Date().toISOString(),
        deliveryAddress: null,
        deliveryNotes: null,
        deliverySlot: deliverySlot || 'morning',
        paymentMethod: null
      });

      // Add order items
      if (items && items.length > 0) {
        for (const item of items) {
          const meal = await storage.getMeal(item.mealId);
          if (meal) {
            const basePrice = 249;
            const price = item.portionSize === 'large' ? basePrice * 1.2 : basePrice;
            
            await storage.addOrderItem({
              orderId: order.id,
              mealId: item.mealId,
              portionSize: item.portionSize,
              price: Math.round(price * 100) / 100
            });
          }
        }
      }

      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get order details with items and meal info
  app.get('/api/orders/:orderId/details', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get week information
      const week = await storage.getWeek(order.weekId);
      
      // Get order items with meal details
      const items = await storage.getOrderItems(orderId);
      
      // Return order with enriched data
      res.json({
        ...order,
        week,
        items
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get upcoming meal selections for a user
  app.get('/api/user/upcoming-meals', authMiddleware, async (req, res) => {
    try {
      // Generate future weeks if needed
      await generateFutureWeeks();

      // Get all available weeks
      const weeks = await storage.getWeeks();

      // Get current date
      const now = new Date();

      // Filter weeks that are upcoming (delivery date is today or in the future)
      const upcomingWeeks = weeks.filter(week => {
        const deliveryDate = new Date(week.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        deliveryDate.setHours(0, 0, 0, 0); // Start of delivery day
        return deliveryDate >= today;
      }).sort((a, b) => {
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      }).slice(0, 4); // Show exactly 4 weeks for users

      // For each upcoming week, get or create the user's order
      const upcomingMeals = [];

      for (const week of upcomingWeeks) {
        // Double-check that this week is actually upcoming (delivery date hasn't passed)
        const deliveryDate = new Date(week.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deliveryDate.setHours(0, 0, 0, 0);
        
        // Skip weeks that have already passed
        if (deliveryDate < today) {
          continue;
        }

        // Get the most recent order for this week (in case of duplicates)
        let order = await storage.getOrderByUserAndWeek(req.session.userId!, week.id);
        
        // If we have multiple orders for the same week, try to find the paid trial box order
        if (order) {
          // Get all orders for this user and week to handle duplicates
          const allUserOrders = await storage.getOrdersByUser(req.session.userId!);
          const ordersForWeek = allUserOrders.filter(o => o.weekId === week.id);
          
          if (ordersForWeek.length > 1) {
            // Prefer the order with a payment method (InstaPay trial box)
            const paidOrder = ordersForWeek.find(o => o.paymentMethod === 'instapay');
            if (paidOrder) {
              order = paidOrder;
            } else {
              // If no paid order, use the most recent one
              order = ordersForWeek.sort((a, b) => b.id - a.id)[0];
            }
          }
        }
        const orderDeadlinePassed = new Date(week.orderDeadline) <= now;

        // If no order exists, create one with user's default meal count and portion preference
        // BUT only if this week wasn't intentionally skipped during onboarding
        if (!order) {
          // Get user's default meal count and portion size from their most recent order
          const userOrders = await storage.getOrdersByUser(req.session.userId!);
          const defaultMealCount = userOrders.length > 0 ? userOrders[userOrders.length - 1].mealCount : 4;
          const defaultPortionSize = userOrders.length > 0 ? userOrders[userOrders.length - 1].defaultPortionSize : 'standard';

          // Check if user has any confirmed orders (not a first-time user)
          const hasConfirmedOrders = userOrders.some(order => order.status === 'confirmed');
          
          // If this is a first-time user, check if this week should be auto-skipped
          if (!hasConfirmedOrders) {
            // Find the earliest non-skipped order to determine user's intended start week
            const nonSkippedOrders = userOrders.filter(order => order.status !== 'skipped');
            if (nonSkippedOrders.length > 0) {
              const earliestSelectedWeek = Math.min(...nonSkippedOrders.map(order => order.weekId));
              
              // If this week is before the user's selected start week, skip it
              if (week.id < earliestSelectedWeek) {
                order = await storage.createOrder({
                  userId: req.session.userId!,
                  weekId: week.id,
                  status: 'skipped',
                  mealCount: defaultMealCount,
                  defaultPortionSize: defaultPortionSize,
                  subtotal: 0,
                  discount: 0,
                  total: 0,
                  deliveryDate: week.deliveryDate.toISOString(),
                  deliveryAddress: null,
                  deliveryNotes: null,
                  paymentMethod: null
                });
              } else {
                // Create normal not_selected order with proper pricing
                const pricing = calculateOrderPricing(defaultMealCount, defaultPortionSize);
                order = await storage.createOrder({
                  userId: req.session.userId!,
                  weekId: week.id,
                  status: 'not_selected',
                  mealCount: defaultMealCount,
                  defaultPortionSize: defaultPortionSize,
                  subtotal: pricing.subtotal,
                  discount: pricing.discount,
                  total: pricing.total,
                  deliveryDate: week.deliveryDate.toISOString(),
                  deliveryAddress: null,
                  deliveryNotes: null,
                  paymentMethod: null
                });
              }
            } else {
              // No non-skipped orders found, create normal order with proper pricing
              const pricing = calculateOrderPricing(defaultMealCount, defaultPortionSize);
              order = await storage.createOrder({
                userId: req.session.userId!,
                weekId: week.id,
                status: 'not_selected',
                mealCount: defaultMealCount,
                defaultPortionSize: defaultPortionSize,
                subtotal: pricing.subtotal,
                discount: pricing.discount,
                total: pricing.total,
                deliveryDate: week.deliveryDate.toISOString(),
                deliveryAddress: null,
                deliveryNotes: null,
                paymentMethod: null
              });
            }
          } else {
            // Existing user, create normal not_selected order with proper pricing
            const pricing = calculateOrderPricing(defaultMealCount, defaultPortionSize);
            order = await storage.createOrder({
              userId: req.session.userId!,
              weekId: week.id,
              status: 'not_selected',
              mealCount: defaultMealCount,
              defaultPortionSize: defaultPortionSize,
              subtotal: pricing.subtotal,
              discount: pricing.discount,
              total: pricing.total,
              deliveryDate: week.deliveryDate.toISOString(),
              deliveryAddress: null,
              deliveryNotes: null,
              paymentMethod: null
            });
          }
        }

        // Get the detailed meal information for each order item
        const orderItems = await storage.getOrderItems(order.id);
        const itemsWithMeals = [];

        for (const item of orderItems) {
          const meal = await storage.getMeal(item.mealId);
          if (meal) {
            itemsWithMeals.push({
              ...item,
              meal
            });
          }
        }

        upcomingMeals.push({
          orderId: order.id,
          weekId: week.id,
          weekLabel: week.label,
          deliveryDate: week.deliveryDate,
          orderDeadline: week.orderDeadline,
          items: itemsWithMeals,
          isSkipped: order.status === 'skipped',
          canEdit: !orderDeadlinePassed,
          canSkip: !orderDeadlinePassed && order.status !== 'skipped',
          canUnskip: !orderDeadlinePassed && order.status === 'skipped',
          mealCount: order.mealCount,
          defaultPortionSize: order.defaultPortionSize || 'standard',
          paymentMethod: order.paymentMethod,
          orderType: order.orderType || 'trial'
        });
      }

      // Disable caching to ensure fresh data when switching weeks
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json({ upcomingMeals });
    } catch (error) {
      console.error('Error fetching upcoming meals:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Skip a delivery
  app.patch('/api/orders/:orderId/skip', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      // Get the order
      const order = await storage.getOrder(orderId);

      // Check if order exists and belongs to user
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Get the order's week to check deadline
      const week = await storage.getWeek(order.weekId);
      if (!week) {
        return res.status(404).json({ message: 'Week not found' });
      }

      // Check if deadline has passed
      const now = new Date();
      if (new Date(week.orderDeadline) <= now) {
        return res.status(400).json({ message: 'Order deadline has passed' });
      }

      // Skip the order
      const updatedOrder = await storage.skipOrder(orderId);

      res.json(updatedOrder);
    } catch (error) {
      console.error('Error skipping order:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Unskip a delivery
  app.patch('/api/orders/:orderId/unskip', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      // Get the order
      const order = await storage.getOrder(orderId);

      // Check if order exists and belongs to user
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Get the order's week to check deadline
      const week = await storage.getWeek(order.weekId);
      if (!week) {
        return res.status(404).json({ message: 'Week not found' });
      }

      // Check if deadline has passed
      const now = new Date();
      if (new Date(week.orderDeadline) <= now) {
        return res.status(400).json({ message: 'Order deadline has passed' });
      }

      // Unskip the order
      const updatedOrder = await storage.unskipOrder(orderId);

      res.json(updatedOrder);
    } catch (error) {
      console.error('Error unskipping order:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/orders/pending', authMiddleware, async (req, res) => {
    try {
      const pendingOrder = await storage.getPendingOrderByUser(req.session.userId!);
      if (!pendingOrder) {
        return res.status(404).json(null);
      }
      res.json(pendingOrder);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/orders/:weekId', authMiddleware, async (req, res) => {
    try {
      let weekId;

      if (req.params.weekId === 'current') {
        const currentWeek = await storage.getCurrentWeek();
        if (!currentWeek) {
          return res.status(404).json({ message: 'No current week found' });
        }
        weekId = currentWeek.id;
      } else {
        weekId = parseInt(req.params.weekId);
      }

      const order = await storage.getOrderByUserAndWeek(req.session.userId!, weekId);
      if (!order) {
        return res.status(404).json(null);
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update delivery preferences for a specific week
  app.patch('/api/orders/:weekId/delivery', authMiddleware, async (req, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const { mealCount, defaultPortionSize, deliverySlot, applyToFuture } = req.body;
      const userId = req.session.userId!;

      // Validate input
      if (!mealCount || !defaultPortionSize) {
        return res.status(400).json({ message: 'Meal count and portion size are required' });
      }

      // Validate delivery slot
      if (deliverySlot && !['morning', 'evening'].includes(deliverySlot)) {
        return res.status(400).json({ message: 'Invalid delivery slot' });
      }

      // Validate meal count (4-15 meals allowed)
      const mealCountNum = parseInt(mealCount);
      if (isNaN(mealCountNum) || mealCountNum < 4 || mealCountNum > 15) {
        return res.status(400).json({ message: 'Meal count must be between 4 and 15' });
      }

      // Validate portion size
      if (!['standard', 'large', 'mixed'].includes(defaultPortionSize)) {
        return res.status(400).json({ message: 'Invalid portion size' });
      }

      // Check if the week exists and order deadline hasn't passed
      const week = await storage.getWeek(weekId);
      if (!week) {
        return res.status(404).json({ message: 'Week not found' });
      }

      const now = new Date();
      const deadline = new Date(week.orderDeadline);
      if (deadline < now) {
        return res.status(400).json({ message: 'Order deadline has passed for this week' });
      }

      // Get or create order for this week
      let order = await storage.getOrderByUserAndWeek(userId, weekId);
      
      if (!order) {
        // Create new order if it doesn't exist
        const pricePerMeal = getPriceForMealCount(mealCountNum);
        let itemPrice = pricePerMeal;
        
        // For mixed portion size, use base standard price
        if (defaultPortionSize === 'large') {
          itemPrice = pricePerMeal + 99;
        } else if (defaultPortionSize === 'mixed') {
          // For mixed, use standard price as base (user will specify individual portions later)
          itemPrice = pricePerMeal;
        }
        
        const subtotal = itemPrice * mealCountNum;
        const fullPriceTotal = parseInt(mealCount) * 249;
        const discount = Math.max(0, fullPriceTotal - subtotal);

        order = await storage.createOrder({
          userId,
          weekId,
          mealCount: parseInt(mealCount),
          defaultPortionSize,
          deliverySlot: deliverySlot || 'morning',
          subtotal,
          discount,
          total: subtotal
        });
      } else {
        // Update existing order
        const pricePerMeal = getPriceForMealCount(mealCountNum);
        let itemPrice = pricePerMeal;
        
        // For mixed portion size, use base standard price
        if (defaultPortionSize === 'large') {
          itemPrice = pricePerMeal + 99;
        } else if (defaultPortionSize === 'mixed') {
          // For mixed, use standard price as base (user will specify individual portions later)
          itemPrice = pricePerMeal;
        }
        
        const subtotal = itemPrice * mealCountNum;
        const fullPriceTotal = parseInt(mealCount) * 249;
        const discount = Math.max(0, fullPriceTotal - subtotal);

        // Clear existing meal selections when meal count changes
        const currentOrderItems = await storage.getOrderItems(order.id);
        if (currentOrderItems.length > 0 && order.mealCount !== mealCountNum) {
          // Remove all existing order items to force fresh selection
          for (const item of currentOrderItems) {
            await storage.removeOrderItem(item.id);
          }
        }

        order = await storage.updateOrder(order.id, {
          mealCount: parseInt(mealCount),
          defaultPortionSize,
          deliverySlot: deliverySlot || order.deliverySlot || 'morning',
          subtotal,
          discount,
          total: subtotal,
          status: 'not_selected' // Reset status when meal selections are cleared
        });
      }

      // If applyToFuture is true, update all future weeks as well
      if (applyToFuture) {
        const allWeeks = await storage.getWeeks();
        const futureWeeks = allWeeks.filter(w => {
          const wDeliveryDate = new Date(w.deliveryDate);
          const currentWeekDeliveryDate = new Date(week.deliveryDate);
          const wDeadline = new Date(w.orderDeadline);
          return wDeliveryDate > currentWeekDeliveryDate && wDeadline > now;
        });

        for (const futureWeek of futureWeeks) {
          let futureOrder = await storage.getOrderByUserAndWeek(userId, futureWeek.id);
          
          const pricePerMeal = getPriceForMealCount(mealCountNum);
          let itemPrice = pricePerMeal;
          
          // For mixed portion size, use base standard price
          if (defaultPortionSize === 'large') {
            itemPrice = pricePerMeal + 99;
          } else if (defaultPortionSize === 'mixed') {
            // For mixed, use standard price as base (user will specify individual portions later)
            itemPrice = pricePerMeal;
          }
          
          const subtotal = itemPrice * mealCountNum;
          const fullPriceTotal = parseInt(mealCount) * 249;
          const discount = Math.max(0, fullPriceTotal - subtotal);

          if (!futureOrder) {
            // Create new order for future week
            await storage.createOrder({
              userId,
              weekId: futureWeek.id,
              mealCount: parseInt(mealCount),
              defaultPortionSize,
              deliverySlot: deliverySlot || 'morning',
              subtotal,
              discount,
              total: subtotal
            });
          } else {
            // Update existing future order
            await storage.updateOrder(futureOrder.id, {
              mealCount: parseInt(mealCount),
              defaultPortionSize,
              deliverySlot: deliverySlot || futureOrder.deliverySlot || 'morning',
              subtotal,
              discount,
              total: subtotal
            });
          }
        }
      }

      res.json({ 
        message: 'Delivery preferences updated successfully',
        order,
        updatedFutureWeeks: applyToFuture
      });
    } catch (error) {
      console.error('Error updating delivery preferences:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update payment method for a specific order
  app.patch('/api/orders/:orderId/payment', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { paymentMethod, applyToFuture } = req.body;
      const userId = req.session.userId!;

      // Validate input
      if (!paymentMethod) {
        return res.status(400).json({ message: 'Payment method is required' });
      }

      // Validate payment method
      const validPaymentMethods = ['credit_card', 'cash', 'bank_transfer'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }

      // Get the order to verify ownership
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized to modify this order' });
      }

      // Update the specific order's payment method
      await storage.updateOrder(orderId, {
        paymentMethod
      });

      // If applyToFuture is true, update all future orders as well
      if (applyToFuture) {
        const userOrders = await storage.getOrdersByUser(userId);
        const currentOrderWeek = await storage.getWeek(order.weekId);
        
        if (currentOrderWeek) {
          const currentDeliveryDate = new Date(currentOrderWeek.deliveryDate);
          
          // Get all future orders for this user
          const futureOrders = [];
          for (const userOrder of userOrders) {
            const orderWeek = await storage.getWeek(userOrder.weekId);
            if (orderWeek) {
              const orderDeliveryDate = new Date(orderWeek.deliveryDate);
              if (orderDeliveryDate > currentDeliveryDate) {
                futureOrders.push(userOrder);
              }
            }
          }

          // Update payment method for all future orders
          for (const futureOrder of futureOrders) {
            await storage.updateOrder(futureOrder.id, {
              paymentMethod
            });
          }
        }
      }

      res.json({
        message: 'Payment method updated successfully',
        updatedFutureOrders: applyToFuture
      });
    } catch (error) {
      console.error('Error updating payment method:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Helper function to auto-skip preceding weeks for first-time users
  const autoSkipPrecedingWeeks = async (userId: number, selectedWeekId: number) => {
    try {
      // Check if user has any confirmed orders (meaning they're not a first-time user)
      const userOrders = await storage.getOrdersByUser(userId);
      const hasConfirmedOrders = userOrders.some(order => order.status === 'confirmed');

      if (hasConfirmedOrders) {
        // User already has confirmed orders, no need to auto-skip
        return;
      }

      // Get all weeks up to the selected week
      const allWeeks = await storage.getWeeks();
      const sortedWeeks = allWeeks.sort((a, b) => 
        new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
      );

      // Find the selected week index
      const selectedWeekIndex = sortedWeeks.findIndex(week => week.id === selectedWeekId);
      if (selectedWeekIndex === -1) return;

      // Get all weeks before the selected week that are still upcoming
      const now = new Date();
      const precedingWeeks = sortedWeeks.slice(0, selectedWeekIndex).filter(week => {
        const deliveryDate = new Date(week.deliveryDate);
        const orderDeadline = new Date(week.orderDeadline);
        // Only skip weeks where the deadline hasn't passed yet
        return orderDeadline > now;
      });

      // Skip all preceding weeks
      for (const week of precedingWeeks) {
        // Check if user already has an order for this week
        let existingOrder = await storage.getOrderByUserAndWeek(userId, week.id);

        if (!existingOrder) {
          // Create a skipped order for this week
          existingOrder = await storage.createOrder({
            userId,
            weekId: week.id,
            status: 'skipped',
            mealCount: 4, // Default meal count
            defaultPortionSize: 'standard',
            subtotal: 0,
            discount: 0,
            total: 0,
            deliveryDate: week.deliveryDate.toISOString()
          });
        } else if (existingOrder.status === 'not_selected') {
          // Update existing not_selected order to skipped
          await storage.updateOrder(existingOrder.id, {
            status: 'skipped'
          });
        }
      }
    } catch (error) {
      console.error('Error auto-skipping preceding weeks:', error);
      // Don't throw error as this is a background operation
    }
  };

  app.post('/api/orders', authMiddleware, async (req, res) => {
    try {
      const { weekId, mealCount, defaultPortionSize, items } = req.body;

      // Get week
      let week;
      if (weekId === 'current') {
        week = await storage.getCurrentWeek();
        if (!week) {
          return res.status(404).json({ message: 'No current week found' });
        }
      } else {
        const weekIdNum = parseInt(weekId);
        week = await storage.getWeek(weekIdNum);
        if (!week) {
          return res.status(404).json({ message: 'Week not found' });
        }
      }

      // Auto-skip preceding weeks for first-time users
      await autoSkipPrecedingWeeks(req.session.userId!, week.id);

      // Calculate prices
      const pricePerMeal = getPriceForMealCount(mealCount);
      const largePortionAdditional = 99;

      let subtotal = 0;

      // Calculate subtotal based on portion sizes
      items.forEach((item: any) => {
        if (item.portionSize === 'large') {
          subtotal += pricePerMeal + largePortionAdditional;
        } else {
          subtotal += pricePerMeal;
        }
      });

      // Calculate full price total and discount
      const fullPriceTotal = mealCount * 249;
      const discount = fullPriceTotal - subtotal;

      // Calculate total
      const total = subtotal;

      // Create order
      const order = await storage.createOrder({
        userId: req.session.userId!,
        weekId: week.id,
        status: 'not_selected',
        mealCount,
        defaultPortionSize,
        subtotal,
        discount,
        total,
        deliveryDate: week.deliveryDate.toISOString()
      });

      // Add order items
      for (const item of items) {
        const itemPrice = item.portionSize === 'large' 
          ? pricePerMeal + largePortionAdditional 
          : pricePerMeal;

        await storage.addOrderItem({
          orderId: order.id,
          mealId: item.mealId,
          portionSize: item.portionSize,
          price: itemPrice
        });
      }

      // Mark order as selected since user has made meal selections
      if (items.length > 0) {
        await storage.markOrderAsSelected(order.id);
      }

      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get order items
  app.get('/api/orders/:orderId/items', async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      // Get the order items
      const orderItems = await storage.getOrderItems(orderId);
      
      res.json(orderItems);
    } catch (error) {
      console.error('Error fetching order items:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Add item to existing order
  app.post('/api/orders/:orderId/items', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { mealId, portionSize } = req.body;

      // Get the order to verify ownership and get week info
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // CRITICAL: Check meal count limit to prevent data corruption
      const currentOrderItems = await storage.getOrderItems(orderId);
      if (currentOrderItems.length >= order.mealCount) {
        return res.status(400).json({ 
          message: `Cannot add more meals. Order limit is ${order.mealCount} meals and you already have ${currentOrderItems.length} meals selected.` 
        });
      }

      // Auto-skip preceding weeks for first-time users
      await autoSkipPrecedingWeeks(req.session.userId, order.weekId);

      // Calculate price
      const pricePerMeal = getPriceForMealCount(order.mealCount);
      const largePortionAdditional = 99;
      const itemPrice = portionSize === 'large' 
        ? pricePerMeal + largePortionAdditional 
        : pricePerMeal;

      // Add the order item
      const orderItem = await storage.addOrderItem({
        orderId,
        mealId,
        portionSize,
        price: itemPrice
      });

      // Update order totals
      const orderItems = await storage.getOrderItems(orderId);
      const newSubtotal = orderItems.reduce((sum, item) => sum + item.price, 0);
      const fullPriceTotal = order.mealCount * 249;
      const discount = fullPriceTotal - newSubtotal;

      await storage.updateOrder(orderId, {
        subtotal: newSubtotal,
        discount,
        total: newSubtotal
      });

      // Don't automatically change status - this should only happen when user explicitly saves

      res.status(201).json(orderItem);
    } catch (error) {
      console.error('Error adding order item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Remove item from existing order
  app.delete('/api/orders/:orderId/items/:itemId', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemId = parseInt(req.params.itemId);

      // Get the order to verify ownership
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Get the order item to verify it belongs to this order
      const orderItems = await storage.getOrderItems(orderId);
      const itemToRemove = orderItems.find(item => item.id === itemId);
      if (!itemToRemove) {
        return res.status(404).json({ message: 'Order item not found' });
      }

      // Remove the item (we'll need to add this method to storage)
      await storage.removeOrderItem(itemId);

      // Update order totals
      const remainingItems = await storage.getOrderItems(orderId);
      const newSubtotal = remainingItems.reduce((sum, item) => sum + item.price, 0);
      const fullPriceTotal = order.mealCount * 249;
      const discount = fullPriceTotal - newSubtotal;

      await storage.updateOrder(orderId, {
        subtotal: newSubtotal,
        discount,
        total: newSubtotal
      });

      res.json({ message: 'Order item removed successfully' });
    } catch (error) {
      console.error('Error removing order item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update individual meal portion size
  app.patch('/api/orders/:orderId/items/:itemId', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemId = parseInt(req.params.itemId);
      const { portionSize } = req.body;

      // Validate portion size
      if (!['standard', 'large'].includes(portionSize)) {
        return res.status(400).json({ message: 'Invalid portion size' });
      }

      // Get the order to verify ownership
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Get the order item to verify it belongs to this order
      const orderItems = await storage.getOrderItems(orderId);
      const itemToUpdate = orderItems.find(item => item.id === itemId);
      if (!itemToUpdate) {
        return res.status(404).json({ message: 'Order item not found' });
      }

      // Calculate new price
      const pricePerMeal = getPriceForMealCount(order.mealCount);
      const largePortionAdditional = 99;
      const newPrice = portionSize === 'large' 
        ? pricePerMeal + largePortionAdditional 
        : pricePerMeal;

      // Update the item - we need to add this method to storage interface
      await storage.updateOrderItem(itemId, {
        portionSize,
        price: newPrice
      });

      // Update order totals
      const updatedItems = await storage.getOrderItems(orderId);
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
      const fullPriceTotal = order.mealCount * 249;
      const discount = fullPriceTotal - newSubtotal;

      await storage.updateOrder(orderId, {
        subtotal: newSubtotal,
        discount,
        total: newSubtotal
      });

      res.json({ message: 'Portion size updated successfully' });
    } catch (error) {
      console.error('Error updating portion size:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Save meal selection and mark order as selected
  app.post('/api/orders/:orderId/save-selection', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      // Get the order to verify ownership
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify order has meals selected
      const orderItems = await storage.getOrderItems(orderId);
      if (orderItems.length === 0) {
        return res.status(400).json({ message: 'No meals selected to save' });
      }

      // Only allow saving if order is in not_selected or selected status (not skipped)
      if (order.status === 'skipped') {
        return res.status(400).json({ message: 'Cannot save selection for skipped orders' });
      }

      // Mark order as selected
      const updatedOrder = await storage.markOrderAsSelected(orderId);

      res.json({ 
        message: 'Selection saved successfully',
        order: updatedOrder 
      });
    } catch (error) {
      console.error('Error saving selection:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/orders/checkout', authMiddleware, upload.single('paymentConfirmationImage'), async (req, res) => {
    try {
      console.log('=== CHECKOUT REQUEST RECEIVED ===');
      console.log('Request body:', req.body);
      console.log('File uploaded:', req.file ? 'YES - ' + req.file.filename : 'NO');
      console.log('Payment method from request:', req.body.paymentMethod);
      console.log('Order type from request:', req.body.orderType);
      console.log('================================');
      
      const { orderId, paymentMethod, orderType, address, deliveryNotes } = req.body;
      const parsedAddress = JSON.parse(address);
      
      console.log('=== EXTRACTED VALUES ===');
      console.log('Order ID:', orderId);
      console.log('Payment Method:', paymentMethod);
      console.log('Order Type:', orderType);
      console.log('Address:', parsedAddress);
      console.log('========================');

      // Get order
      const order = await storage.getOrder(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify order belongs to user
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Prepare order update data
      const orderUpdateData: any = {
        status: 'selected',
        deliveryAddress: JSON.stringify(parsedAddress),
        deliveryNotes,
        paymentMethod: paymentMethod || null,
        orderType: orderType || 'trial'
      };
      
      console.log('=== PAYMENT METHOD DEBUG ===');
      console.log('Raw payment method from request:', req.body.paymentMethod);
      console.log('Destructured payment method:', paymentMethod);
      console.log('Payment method in update data:', orderUpdateData.paymentMethod);
      console.log('Is payment method truthy?', !!paymentMethod);
      console.log('Payment method type:', typeof paymentMethod);
      console.log('============================');

      // Handle InstaPay payment
      if (paymentMethod === 'instapay') {
        console.log('=== INSTAPAY CHECKOUT DETECTED ===');
        console.log('Processing InstaPay payment for order:', orderId);
        console.log('Payment method:', paymentMethod);
        console.log('Order type:', orderType);
        console.log('File uploaded:', req.file ? 'YES' : 'NO');
        if (!req.file) {
          return res.status(400).json({ message: 'Payment confirmation image required for InstaPay' });
        }

        console.log('Payment confirmation image uploaded:', req.file.filename);
        // Set payment status to processing for InstaPay
        orderUpdateData.paymentStatus = 'processing';
        orderUpdateData.paymentConfirmationImage = req.file.filename;

        // Get user info for email
        const user = await storage.getUser(req.session.userId!);
        if (user) {
          console.log('Sending InstaPay email notification to admin for order:', orderId);
          // Send email notification to admin
          const emailSent = await sendEmail({
            to: 'aelnaggar35@gmail.com',
            from: 'aelnaggar35@gmail.com',
            subject: 'New InstaPay Payment Confirmation - Order #' + orderId,
            html: `
              <h2>New InstaPay Payment Confirmation</h2>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Customer:</strong> ${user.name || user.username}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Phone:</strong> ${parsedAddress.phone}</p>
              <p><strong>Order Type:</strong> ${orderType}</p>
              <p><strong>Total:</strong> ${order.total} EGP</p>
              
              <h3>Delivery Address:</h3>
              <p>${parsedAddress.name}<br/>
              ${parsedAddress.street}<br/>
              ${parsedAddress.area}<br/>
              ${parsedAddress.building ? 'Building: ' + parsedAddress.building + '<br/>' : ''}
              ${parsedAddress.apartment ? 'Apartment: ' + parsedAddress.apartment + '<br/>' : ''}
              ${parsedAddress.landmark ? 'Landmark: ' + parsedAddress.landmark + '<br/>' : ''}
              Phone: ${parsedAddress.phone}</p>
              
              <p><strong>Delivery Notes:</strong> ${deliveryNotes || 'None'}</p>
              
              <p>Please verify the payment confirmation image attached and update the order status in the admin dashboard.</p>
            `,
            attachments: [{
              content: fs.readFileSync(req.file.path).toString('base64'),
              filename: `payment-confirmation-${orderId}.${req.file.originalname?.split('.').pop() || 'jpg'}`,
              type: req.file.mimetype,
              disposition: 'attachment'
            }]
          });

          if (!emailSent) {
            console.error('Failed to send payment confirmation email');
            // Log InstaPay payment details for manual review
            console.log('=== INSTAPAY PAYMENT NOTIFICATION ===');
            console.log('Order ID:', orderId);
            console.log('Customer:', user.name || user.username);
            console.log('Email:', user.email);
            console.log('Phone:', parsedAddress.phone);
            console.log('Order Type:', orderType);
            console.log('Total:', order.total, 'EGP');
            console.log('Area:', parsedAddress.area);
            console.log('Payment Image:', req.file.filename);
            console.log('Status: PROCESSING - Please check admin dashboard');
            console.log('========================================');
          } else {
            console.log('Email sent successfully to admin for order:', orderId);
          }
        }
      } else {
        // For card payments, set status to confirmed
        orderUpdateData.paymentStatus = 'confirmed';
      }

      // Update order
      console.log('=== ORDER UPDATE DATA ===');
      console.log('Order ID to update:', parseInt(orderId));
      console.log('Order update data:', orderUpdateData);
      console.log('=========================');
      
      const updatedOrder = await storage.updateOrder(parseInt(orderId), orderUpdateData);
      
      console.log('=== ORDER UPDATED ===');
      console.log('Updated order payment method:', updatedOrder.paymentMethod);
      console.log('Updated order payment status:', updatedOrder.paymentStatus);
      console.log('====================');

      // Always update user address and phone from checkout
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        // Include delivery notes in the address object for user profile
        const addressWithNotes = {
          ...parsedAddress,
          deliveryNotes: deliveryNotes || ""
        };
        
        // Update user with address and trial status
        const userUpdateData: any = {
          address: JSON.stringify(addressWithNotes),
          phone: parsedAddress.phone
        };
        
        // If this is a trial box order, mark user as having used their trial
        if (orderType === 'trial') {
          userUpdateData.hasUsedTrialBox = true;
        }
        
        // If this is a subscription order, update user type
        if (orderType === 'subscription') {
          userUpdateData.userType = 'subscriber';
        }
        
        await storage.updateUser(req.session.userId!, userUpdateData);
        console.log('Updated user address with delivery notes:', JSON.stringify(addressWithNotes));
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin Routes - Orders Management
  app.get('/api/admin/orders', adminMiddleware, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/orders/:weekId', adminMiddleware, async (req, res) => {
    try {
      let weekId;

      if (req.params.weekId === 'current') {
        const currentWeek = await storage.getCurrentWeek();
        if (!currentWeek) {
          return res.status(404).json({ message: 'No current week found' });
        }
        weekId = currentWeek.id;
      } else {
        weekId = parseInt(req.params.weekId);
      }

      const orders = await storage.getOrdersByWeek(weekId);
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/admin/orders/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { delivered, ...orderData } = req.body;
      
      // Handle delivery status separately - only allow toggling delivered flag
      if (delivered !== undefined) {
        const order = await storage.updateOrder(id, { delivered });
        return res.json(order);
      }
      
      // For other updates, ensure status is not changed to 'delivered'
      if (orderData.status === 'delivered') {
        return res.status(400).json({ message: 'Use delivered field to track delivery status' });
      }
      
      const order = await storage.updateOrder(id, orderData);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin Routes - Users Management
  app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();

      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json({ users: safeUsers });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin meal management endpoints
  app.post('/api/admin/meals', adminMiddleware, async (req, res) => {
    try {
      const mealData = insertMealSchema.parse(req.body);
      const meal = await storage.createMeal(mealData);
      res.status(201).json(meal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid meal data', errors: error.errors });
      }
      console.error('Error creating meal:', error);
      res.status(500).json({ message: "Failed to create meal" });
    }
  });

  app.patch("/api/admin/meals/:id", adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mealData = req.body;
      const meal = await storage.updateMeal(id, mealData);
      res.json(meal);
    } catch (error) {
      console.error('Error updating meal:', error);
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  app.put("/api/admin/meals/:id", adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mealData = req.body;
      const meal = await storage.updateMeal(id, mealData);
      res.json(meal);
    } catch (error) {
      console.error('Error updating meal:', error);
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  app.delete("/api/admin/meals/:id", adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMeal(id);
      res.json({ message: "Meal deleted successfully" });
    } catch (error) {
      console.error('Error deleting meal:', error);
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // Initialize HTTP server
  const httpServer = createServer(app);

  // Pre-onboarding filtration routes
  app.get('/api/neighborhoods/serviced', async (req, res) => {
    try {
      const neighborhoods = await storage.getServicedNeighborhoods();
      res.json({ neighborhoods });
    } catch (error) {
      console.error('Error fetching serviced neighborhoods:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pre-onboarding/validate', async (req, res) => {
    try {
      const { email, neighborhood, invitationCode } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.json({
          success: false,
          redirectToLogin: true,
          message: "An account with this email already exists. Please log in instead."
        });
      }

      let shouldAddToWaitlist = false;
      let rejectionMessage = "";

      // Validate invitation code
      const validCode = await storage.validateInvitationCode(invitationCode);
      if (!validCode) {
        shouldAddToWaitlist = true;
        rejectionMessage = "Sorry, the invitation code you entered is not valid or has reached its usage limit. We've added you to our waitlist and will contact you when we have more capacity.";
      }

      // Check if neighborhood is serviced
      const allNeighborhoods = await storage.getAllNeighborhoods();
      const selectedNeighborhood = allNeighborhoods.find(n => n.name === neighborhood);
      
      if (!selectedNeighborhood?.isServiced) {
        shouldAddToWaitlist = true;
        rejectionMessage = `Sorry, we don't currently deliver to ${neighborhood}. We've added you to our waitlist and will notify you when we expand service to your area.`;
      }

      // Add to waitlist if needed
      if (shouldAddToWaitlist) {
        await storage.addToWaitlist({
          email,
          neighborhood,
          rejectionReason: !validCode ? 'invalid_code' : 'unserviced_area'
        });

        return res.json({
          success: false,
          message: rejectionMessage
        });
      }

      // Increment code usage for valid submissions
      if (validCode) {
        await storage.incrementCodeUsage(invitationCode);
      }

      // Store neighborhood data for pre-population in registration
      // This will be retrieved later via sessionStorage in the frontend

      res.json({
        success: true,
        message: "Welcome! You're eligible for Wagba."
      });
    } catch (error) {
      console.error('Error validating pre-onboarding:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public endpoint to get all neighborhoods (for pre-onboarding modal)
  app.get('/api/neighborhoods', async (req, res) => {
    try {
      const neighborhoods = await storage.getAllNeighborhoods();
      res.json({ neighborhoods });
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin routes for managing neighborhoods and invitation codes
  app.get('/api/admin/neighborhoods', adminMiddleware, async (req, res) => {
    try {
      const neighborhoods = await storage.getAllNeighborhoods();
      res.json({ neighborhoods });
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/neighborhoods', adminMiddleware, async (req, res) => {
    try {
      const { name, isServiced, availableDeliverySlots, preferredDeliverySlot } = req.body;
      const neighborhood = await storage.createNeighborhood({ 
        name, 
        isServiced, 
        availableDeliverySlots: availableDeliverySlots || ['morning', 'evening'], 
        preferredDeliverySlot: preferredDeliverySlot || 'morning'
      });
      res.status(201).json(neighborhood);
    } catch (error) {
      console.error('Error creating neighborhood:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/admin/neighborhoods/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const neighborhoodData = req.body;
      const neighborhood = await storage.updateNeighborhood(id, neighborhoodData);
      res.json(neighborhood);
    } catch (error) {
      console.error('Error updating neighborhood:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/admin/neighborhoods/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNeighborhood(id);
      res.json({ message: 'Neighborhood deleted successfully' });
    } catch (error) {
      console.error('Error deleting neighborhood:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/invitation-codes', adminMiddleware, async (req, res) => {
    try {
      const codes = await storage.getAllInvitationCodes();
      res.json({ codes });
    } catch (error) {
      console.error('Error fetching invitation codes:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/invitation-codes', adminMiddleware, async (req, res) => {
    try {

      const { code, isActive, maxUses, description } = req.body;
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: 'Code is required' });
      }
      
      const invitationCode = await storage.createInvitationCode({
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        maxUses: maxUses || null,
        description: description || ""
      });
      

      res.status(201).json(invitationCode);
    } catch (error: any) {
      console.error('Error creating invitation code:', error);
      console.error('Error details:', error?.message);
      console.error('Error stack:', error?.stack);
      res.status(500).json({ message: `Server error: ${error?.message || 'Unknown error'}` });
    }
  });

  app.patch('/api/admin/invitation-codes/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const codeData = req.body;
      const invitationCode = await storage.updateInvitationCode(id, codeData);
      

      res.json(invitationCode);
    } catch (error: any) {
      console.error('Error updating invitation code:', error);
      console.error('Error details:', error?.message);
      console.error('Error stack:', error?.stack);
      res.status(500).json({ message: `Server error: ${error?.message || 'Unknown error'}` });
    }
  });

  app.delete('/api/admin/invitation-codes/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInvitationCode(id);
      res.json({ message: 'Invitation code deleted successfully' });
    } catch (error) {
      console.error('Error deleting invitation code:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin endpoint to view waitlist entries
  app.get('/api/admin/waitlist', adminMiddleware, async (req, res) => {
    try {
      const waitlistEntries = await storage.getAllWaitlistEntries();
      res.json({ waitlistEntries });
    } catch (error) {
      console.error('Error fetching waitlist entries:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/waitlist', adminMiddleware, async (req, res) => {
    try {
      const waitlistEntries = await storage.getAllWaitlistEntries();
      res.json({ waitlistEntries });
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/admin/waitlist/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.removeFromWaitlist(id);
      res.json({ message: 'Waitlist entry removed successfully' });
    } catch (error) {
      console.error('Error removing waitlist entry:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin pricing configuration routes
  app.get('/api/admin/pricing', adminMiddleware, async (req, res) => {
    try {
      const pricingConfigs = await storage.getAllPricingConfigs();
      res.json({ pricingConfigs });
    } catch (error) {
      console.error('Error fetching pricing configs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/pricing/:type', adminMiddleware, async (req, res) => {
    try {
      const configType = req.params.type;
      const pricingConfigs = await storage.getPricingConfigsByType(configType);
      res.json({ pricingConfigs });
    } catch (error) {
      console.error('Error fetching pricing configs by type:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/pricing', adminMiddleware, async (req, res) => {
    try {
      const { configType, configKey, price, description, isActive } = req.body;
      const newConfig = await storage.createPricingConfig({
        configType,
        configKey,
        price,
        description,
        isActive
      });
      res.status(201).json(newConfig);
    } catch (error) {
      console.error('Error creating pricing config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/admin/pricing/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configData = req.body;
      const updatedConfig = await storage.updatePricingConfig(id, configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error('Error updating pricing config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/admin/pricing/:id', adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePricingConfig(id);
      res.json({ message: 'Pricing config deleted successfully' });
    } catch (error) {
      console.error('Error deleting pricing config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public endpoint to get current pricing configurations
  app.get('/api/pricing', async (req, res) => {
    try {
      const pricingConfigs = await storage.getAllPricingConfigs();
      const activePricing = pricingConfigs.filter(config => config.isActive);
      res.json({ pricingConfigs: activePricing });
    } catch (error) {
      console.error('Error fetching pricing:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/pricing/:type', async (req, res) => {
    try {
      const configType = req.params.type;
      const pricingConfigs = await storage.getPricingConfigsByType(configType);
      const activePricing = pricingConfigs.filter(config => config.isActive);
      res.json({ pricingConfigs: activePricing });
    } catch (error) {
      console.error('Error fetching pricing by type:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Super Admin Routes - Admin Management
  // Get all admins (super admin only)
  app.get('/api/admin/admins', superAdminMiddleware, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      // Don't return passwords
      const safeAdmins = admins.map(admin => ({
        ...admin,
        password: undefined
      }));
      res.json({ admins: safeAdmins });
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create new admin (super admin only)
  app.post('/api/admin/admins', superAdminMiddleware, async (req, res) => {
    try {
      const { username, password, name, email, role } = req.body;
      
      // Validate required fields
      if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
      }

      // Validate role
      if (role && !['admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be admin or super_admin' });
      }

      // Check if username or email already exists
      const existingByUsername = await storage.getAdminByUsername(username);
      const existingByEmail = await storage.getAdminByEmail(email);
      
      if (existingByUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      if (existingByEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await storage.createAdmin({
        username,
        password: hashedPassword,
        name: name || username,
        email,
        role: role || 'admin',
        permissions: ['orders', 'meals', 'users', 'weeks']
      });

      // Don't return password
      const safeAdmin = { ...newAdmin, password: undefined };
      res.status(201).json({ admin: safeAdmin });
    } catch (error) {
      console.error('Error creating admin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update admin (super admin only)
  app.put('/api/admin/admins/:id', superAdminMiddleware, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const { username, password, name, email, role } = req.body;
      
      const existingAdmin = await storage.getAdmin(adminId);
      if (!existingAdmin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      // Validate role if provided
      if (role && !['admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be admin or super_admin' });
      }

      // Check if username or email conflicts with other admins
      if (username && username !== existingAdmin.username) {
        const existingByUsername = await storage.getAdminByUsername(username);
        if (existingByUsername && existingByUsername.id !== adminId) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      
      if (email && email !== existingAdmin.email) {
        const existingByEmail = await storage.getAdminByEmail(email);
        if (existingByEmail && existingByEmail.id !== adminId) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      const updateData: any = {};
      if (username) updateData.username = username;
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      const updatedAdmin = await storage.updateAdmin(adminId, updateData);
      
      // Don't return password
      const safeAdmin = { ...updatedAdmin, password: undefined };
      res.json({ admin: safeAdmin });
    } catch (error) {
      console.error('Error updating admin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete admin (super admin only)
  app.delete('/api/admin/admins/:id', superAdminMiddleware, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const currentAdmin = req.admin;
      
      // Prevent self-deletion
      if (currentAdmin && currentAdmin.id === adminId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const existingAdmin = await storage.getAdmin(adminId);
      if (!existingAdmin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      // For now, we'll implement a soft delete by updating the admin to mark as inactive
      // In a real system, you might want to keep admin records for audit purposes
      await storage.updateAdmin(adminId, { 
        username: `deleted_${existingAdmin.username}_${Date.now()}`,
        email: `deleted_${existingAdmin.email}_${Date.now()}`,
        role: 'deleted' as any // This will need to be handled in the database
      });
      
      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get current admin profile (includes role info)
  app.get('/api/admin/auth/me', adminMiddleware, async (req, res) => {
    try {
      const admin = req.admin;
      if (!admin) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Don't return password
      const safeAdmin = { ...admin, password: undefined };
      res.json(safeAdmin);
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin endpoint to update payment status
  app.patch('/api/admin/orders/:id/payment-status', adminMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { paymentStatus } = req.body;
      
      console.log('DEBUG: Admin payment status update called with:', { orderId, paymentStatus });
      
      if (!['pending', 'processing', 'confirmed', 'failed'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, { paymentStatus });
      console.log('DEBUG: Order updated successfully:', updatedOrder);
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return httpServer;
}