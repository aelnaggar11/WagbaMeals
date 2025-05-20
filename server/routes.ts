import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertMealSchema, insertWeekSchema, insertOrderSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from 'memorystore';
import { getPriceForMealCount } from "@shared/schema";

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'wagba-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
    store: new SessionStore({
      checkPeriod: 86400000 // 24 hours
    })
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
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    next();
  };

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
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
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
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
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
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json(null);
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User Routes
  app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/user/profile', authMiddleware, async (req, res) => {
    try {
      const { name, email, phone, address } = req.body;
      
      const updatedUser = await storage.updateUser(req.session.userId, {
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

  // Weeks Routes
  app.get('/api/weeks', async (req, res) => {
    try {
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
      const orders = await storage.getOrdersByUser(req.session.userId);
      res.json({ orders });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get upcoming meal selections for a user
  app.get('/api/user/upcoming-meals', authMiddleware, async (req, res) => {
    try {
      // Get all available weeks
      const weeks = await storage.getWeeks();
      
      // Get current date
      const now = new Date();
      
      // Filter weeks that are upcoming (delivery date is in the future)
      const upcomingWeeks = weeks.filter(week => {
        const deliveryDate = new Date(week.deliveryDate);
        return deliveryDate > now;
      }).sort((a, b) => {
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      });
      
      // For each upcoming week, get the user's order if it exists
      const upcomingMeals = [];
      
      for (const week of upcomingWeeks) {
        const order = await storage.getOrderByUserAndWeek(req.session.userId, week.id);
        const orderDeadlinePassed = new Date(week.orderDeadline) <= now;
        
        // Check if there's an existing order
        if (order) {
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
        } else {
          // No order yet for this week
          upcomingMeals.push({
            orderId: null,
            weekId: week.id,
            weekLabel: week.label,
            deliveryDate: week.deliveryDate,
            orderDeadline: week.orderDeadline,
            items: [],
            isSkipped: false,
            canEdit: !orderDeadlinePassed,
            canSkip: false, // Can't skip an order that doesn't exist yet
            canUnskip: false,
            mealCount: 0
          });
        }
      }
      
      res.json({ upcomingMeals });
    } catch (error) {
      console.error('Error fetching upcoming meals:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Skip or unskip a delivery
  app.patch('/api/orders/:orderId/skip', authMiddleware, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { skip } = req.body;
      
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
      
      // Update order status
      const updatedOrder = await storage.updateOrder(orderId, {
        status: skip ? 'skipped' : 'pending'
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error skipping/unskipping order:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/orders/pending', authMiddleware, async (req, res) => {
    try {
      const pendingOrder = await storage.getPendingOrderByUser(req.session.userId);
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
      
      const order = await storage.getOrderByUserAndWeek(req.session.userId, weekId);
      if (!order) {
        return res.status(404).json(null);
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

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
        userId: req.session.userId,
        weekId: week.id,
        status: 'pending',
        mealCount,
        defaultPortionSize,
        subtotal,
        discount,
        total,
        deliveryDate: week.deliveryDate
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
      
      res.status(201).json(order);
    } catch (error) {
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
        status: 'confirmed',
        deliveryAddress: JSON.stringify(address),
        deliveryNotes,
        paymentMethod
      });
      
      // Update user address if not set
      const user = await storage.getUser(req.session.userId);
      if (!user.address) {
        await storage.updateUser(req.session.userId, {
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
      const orderData = req.body;
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

  // Initialize HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
