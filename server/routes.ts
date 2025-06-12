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
import { getPriceForMealCount } from "@shared/schema";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    adminId?: number;
    tempMealSelections?: {
      weekId: number;
      mealCount: number;
      portionSize: string;
      selectedMeals: any[];
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup with production warning
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    console.warn('SESSION_SECRET not set in production - please configure this in your deployment settings for security');
  }
  
  // Use database session store for production, memory store for development
  let sessionStore;
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL && pool) {
    try {
      const PgSession = ConnectPgSimple(session);
      sessionStore = new PgSession({
        pool: pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      console.log('Using PostgreSQL session store for production');
    } catch (error) {
      console.warn('Failed to initialize PostgreSQL session store, falling back to memory store:', error);
      const SessionStore = MemoryStore(session);
      sessionStore = new SessionStore({
        checkPeriod: 86400000 // 24 hours
      });
    }
  } else {
    const SessionStore = MemoryStore(session);
    sessionStore = new SessionStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  app.use(session({
    secret: sessionSecret || 'wagba-secret-key-development-only',
    resave: false,
    saveUninitialized: true, // Allow sessions for anonymous users during onboarding
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax' // Use 'lax' for both environments to allow navigation during onboarding
    },
    store: sessionStore
  }));

  // Authentication middleware
  const authMiddleware = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };

  // Admin middleware
  const adminMiddleware = async (req: Request, res: Response, next: Function) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    }

    const admin = await storage.getAdmin(req.session.adminId);
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden - Invalid admin session' });
    }

    next();
  };

  // Temporary meal selection storage for onboarding
  app.post('/api/temp/meal-selections', async (req, res) => {
    try {
      const { weekId, mealCount, portionSize, selectedMeals } = req.body;
      
      if (!weekId || !mealCount || !selectedMeals) {
        return res.status(400).json({ message: 'Missing required meal selection data' });
      }

      // Store in session for reliable cross-page persistence
      req.session.tempMealSelections = {
        weekId,
        mealCount,
        portionSize,
        selectedMeals
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

          // Create the order using the temporarily stored selections
          const order = await storage.createOrder({
            userId: user.id,
            weekId: selections.weekId,
            mealCount: selections.mealCount,
            defaultPortionSize: selections.portionSize,
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
        address: user.address
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

      // Set session with debugging
      req.session.userId = user.id;


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

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
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
      if (!req.session.userId) {
        return res.status(401).json(null);
      }

      const user = await storage.getUser(req.session.userId!);
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


      res.json({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/auth/me', async (req, res) => {
    try {
      if (!req.session.adminId) {
        return res.status(401).json(null);
      }

      const admin = await storage.getAdmin(req.session.adminId);
      if (!admin) {
        return res.status(401).json(null);
      }

      res.json({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role
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
        address: user?.address
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
      const { weekId, mealCount, defaultPortionSize, items, totalPrice } = req.body;

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
        paymentMethod: null
      });

      // Add order items
      if (items && items.length > 0) {
        for (const item of items) {
          const meal = await storage.getMeal(item.mealId);
          if (meal) {
            const basePrice = meal.price || 249;
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
        let order = await storage.getOrderByUserAndWeek(req.session.userId!, week.id);
        const orderDeadlinePassed = new Date(week.orderDeadline) <= now;

        // If no order exists, create one with user's default meal count
        if (!order) {
          // Get user's default meal count from their most recent order
          const userOrders = await storage.getOrdersByUser(req.session.userId!);
          const defaultMealCount = userOrders.length > 0 ? userOrders[userOrders.length - 1].mealCount : 4;

          order = await storage.createOrder({
            userId: req.session.userId!,
            weekId: week.id,
            status: 'not_selected',
            mealCount: defaultMealCount,
            defaultPortionSize: 'standard',
            subtotal: 0,
            discount: 0,
            total: 0,
            deliveryDate: week.deliveryDate.toISOString(),
            deliveryAddress: null,
            deliveryNotes: null,
            paymentMethod: null
          });
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
          mealCount: order.mealCount
        });
      }

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

      // Mark order as selected since user has added meal items
      if (order.status === 'not_selected') {
        await storage.markOrderAsSelected(orderId);
      }

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

  app.post('/api/orders/checkout', authMiddleware, async (req, res) => {
    try {
      const { orderId, paymentMethod, address, deliveryNotes } = req.body;

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify order belongs to user
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Update order
      const updatedOrder = await storage.updateOrder(orderId, {
        status: 'selected',
        deliveryAddress: JSON.stringify(address),
        deliveryNotes,
        paymentMethod
      });

      // Update user address if not set
      const user = await storage.getUser(req.session.userId!);
      if (user && !user.address) {
        await storage.updateUser(req.session.userId!, {
          address: JSON.stringify(address),
          phone: address.phone
        });
      }

      res.json(updatedOrder);
    } catch (error) {
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

  return httpServer;
}