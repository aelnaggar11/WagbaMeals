import { 
  User, InsertUser, 
  Admin, InsertAdmin,
  Meal, InsertMeal, 
  Week, InsertWeek, 
  WeekMeal, InsertWeekMeal,
  Order, InsertOrder,
  OrderItemFull, InsertOrderItem,
  UserWeekStatus, InsertUserWeekStatus
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Meal methods
  getMeal(id: number): Promise<Meal | undefined>;
  getMealsByWeek(weekId: number): Promise<Meal[]>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, mealData: Partial<Meal>): Promise<Meal>;
  deleteMeal(id: number): Promise<void>;
  getAllMeals(): Promise<Meal[]>;
  
  // Week methods
  getWeek(id: number): Promise<Week | undefined>;
  getWeeks(): Promise<Week[]>;
  getCurrentWeek(): Promise<Week | undefined>;
  createWeek(week: InsertWeek): Promise<Week>;
  updateWeek(id: number, weekData: Partial<Week>): Promise<Week>;
  
  // WeekMeal methods
  addMealToWeek(weekMeal: InsertWeekMeal): Promise<WeekMeal>;
  removeMealFromWeek(weekId: number, mealId: number): Promise<void>;
  getWeekMeals(weekId: number): Promise<WeekMeal[]>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrderByUserAndWeek(userId: number, weekId: number): Promise<any | undefined>;
  getPendingOrderByUser(userId: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, orderData: Partial<Order>): Promise<Order>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByWeek(weekId: number): Promise<Order[]>;
  
  // OrderItem methods
  getOrderItems(orderId: number): Promise<OrderItemFull[]>;
  addOrderItem(orderItem: InsertOrderItem): Promise<OrderItemFull>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private admins: Map<number, Admin>;
  private meals: Map<number, Meal>;
  private weeks: Map<number, Week>;
  private weekMeals: Map<number, WeekMeal>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItemFull>;
  
  private currentUserId: number;
  private currentAdminId: number;
  private currentMealId: number;
  private currentWeekId: number;
  private currentWeekMealId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;

  constructor() {
    this.users = new Map();
    this.admins = new Map();
    this.meals = new Map();
    this.weeks = new Map();
    this.weekMeals = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    
    this.currentUserId = 1;
    this.currentAdminId = 1;
    this.currentMealId = 1;
    this.currentWeekId = 1;
    this.currentWeekMealId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    
    this.initializeDemoData();
  }

  // Helper method to initialize demo data
  private async initializeDemoData() {
    // Create admin
    const admin = await this.createAdmin({
      username: "admin",
      password: "$2a$10$yQb5/ROTsUSD8X.7J2iG0OTxU.UDdoirnxzTXNJY7Gs1QoXQrRdZ6", // "admin123"
      email: "admin@wagba.com",
      name: "Admin User",
      role: "super_admin",
      permissions: ["all"]
    });

    // Create regular user
    const regUser = await this.createUser({
      username: "user",
      password: "$2a$10$YPE8VB46d.NBrbTUHg/Ay.Q28a0FEXucfsCZ8rSs8XyTwUg4EiIDq", // "user123"
      email: "user@wagba.com",
      name: "Regular User"
    });

    // Create weeks
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate);
    const dayOfWeek = currentDate.getDay();
    
    // Adjust to start of week (Monday)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(currentDate.getDate() - daysFromMonday);
    
    // Create weeks
    const week1 = await this.createWeek({
      identifier: "current",
      label: `${currentWeekStart.toLocaleDateString()} - ${new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      startDate: currentWeekStart,
      endDate: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      orderDeadline: new Date(currentWeekStart.getTime() + 2 * 24 * 60 * 60 * 1000), // Wednesday
      deliveryDate: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000), // Sunday
      isActive: true,
      isSelectable: true
    });
    
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    
    const week2 = await this.createWeek({
      identifier: "next",
      label: `${nextWeekStart.toLocaleDateString()} - ${new Date(nextWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      startDate: nextWeekStart,
      endDate: new Date(nextWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      orderDeadline: new Date(nextWeekStart.getTime() + 2 * 24 * 60 * 60 * 1000), // Wednesday
      deliveryDate: new Date(nextWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000), // Sunday
      isActive: true,
      isSelectable: true
    });

    // Create meals
    const meal1 = await this.createMeal({
      title: "Herb Grilled Chicken",
      description: "Marinated chicken breast with herbs, served with roasted vegetables and quinoa.",
      imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
      calories: 520,
      protein: 38,
      price: 249,
      tags: [],
      category: "Main Dishes"
    });

    const meal2 = await this.createMeal({
      title: "Beef Stir Fry",
      description: "Lean beef strips stir-fried with fresh vegetables in a savory sauce, served with brown rice.",
      imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19",
      calories: 580,
      protein: 42,
      price: 249,
      tags: [],
      category: "Main Dishes"
    });

    const meal3 = await this.createMeal({
      title: "Salmon Grain Bowl",
      description: "Wild-caught salmon with fresh greens, avocado, and ancient grains in a lemon dressing.",
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      calories: 490,
      protein: 32,
      price: 249,
      tags: [],
      category: "Main Dishes"
    });

    const meal4 = await this.createMeal({
      title: "Stuffed Bell Peppers",
      description: "Bell peppers stuffed with quinoa, black beans, corn, and topped with cheese.",
      imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6",
      calories: 420,
      protein: 24,
      price: 249,
      tags: ["vegetarian"],
      category: "Vegetarian"
    });

    const meal5 = await this.createMeal({
      title: "Turkey Meatballs",
      description: "Lean turkey meatballs in a homemade tomato sauce served with whole wheat pasta.",
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554",
      calories: 560,
      protein: 36,
      price: 249,
      tags: [],
      category: "Main Dishes"
    });

    const meal6 = await this.createMeal({
      title: "Thai Shrimp Salad",
      description: "Fresh shrimp with crunchy vegetables and herbs in a tangy Thai-inspired dressing.",
      imageUrl: "https://images.unsplash.com/photo-1551248429-40975aa4de74",
      calories: 390,
      protein: 28,
      price: 249,
      tags: [],
      category: "Seafood"
    });

    // Add meals to weeks
    await this.addMealToWeek({ weekId: week1.id, mealId: meal1.id, isAvailable: true, isFeatured: true, sortOrder: 1 });
    await this.addMealToWeek({ weekId: week1.id, mealId: meal2.id, isAvailable: true, isFeatured: false, sortOrder: 2 });
    await this.addMealToWeek({ weekId: week1.id, mealId: meal3.id, isAvailable: true, isFeatured: true, sortOrder: 3 });
    await this.addMealToWeek({ weekId: week1.id, mealId: meal4.id, isAvailable: true, isFeatured: false, sortOrder: 4 });
    await this.addMealToWeek({ weekId: week1.id, mealId: meal5.id, isAvailable: true, isFeatured: false, sortOrder: 5 });
    await this.addMealToWeek({ weekId: week1.id, mealId: meal6.id, isAvailable: true, isFeatured: false, sortOrder: 6 });
    
    await this.addMealToWeek({ weekId: week2.id, mealId: meal1.id, isAvailable: true, isFeatured: true, sortOrder: 1 });
    await this.addMealToWeek({ weekId: week2.id, mealId: meal2.id, isAvailable: true, isFeatured: false, sortOrder: 2 });
    await this.addMealToWeek({ weekId: week2.id, mealId: meal3.id, isAvailable: true, isFeatured: true, sortOrder: 3 });
    await this.addMealToWeek({ weekId: week2.id, mealId: meal4.id, isAvailable: true, isFeatured: false, sortOrder: 4 });
    await this.addMealToWeek({ weekId: week2.id, mealId: meal5.id, isAvailable: true, isFeatured: false, sortOrder: 5 });
    await this.addMealToWeek({ weekId: week2.id, mealId: meal6.id, isAvailable: true, isFeatured: false, sortOrder: 6 });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      name: insertUser.name || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.get(id);
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    for (const admin of [...this.admins.values()]) {
      if (admin.username === username) {
        return admin;
      }
    }
    return undefined;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    for (const admin of [...this.admins.values()]) {
      if (admin.email === email) {
        return admin;
      }
    }
    return undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const id = this.currentAdminId++;
    const now = new Date();
    const admin: Admin = { 
      ...insertAdmin, 
      id, 
      createdAt: now,
      name: insertAdmin.name || null,
      role: insertAdmin.role || null,
      permissions: insertAdmin.permissions || null
    };
    this.admins.set(id, admin);
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin> {
    const existingAdmin = this.admins.get(id);
    if (!existingAdmin) {
      throw new Error(`Admin with id ${id} not found`);
    }
    
    const updatedAdmin = { ...existingAdmin, ...adminData };
    this.admins.set(id, updatedAdmin);
    return updatedAdmin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return [...this.admins.values()];
  }

  // Meal methods
  async getMeal(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }

  async getMealsByWeek(weekId: number): Promise<Meal[]> {
    const weekMeals = Array.from(this.weekMeals.values()).filter(
      (wm) => wm.weekId === weekId && wm.isAvailable
    );
    
    return Promise.all(
      weekMeals.map(async (wm) => {
        const meal = await this.getMeal(wm.mealId);
        if (!meal) {
          throw new Error('Meal not found');
        }
        return meal;
      })
    );
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const id = this.currentMealId++;
    const now = new Date();
    const meal: Meal = { 
      ...insertMeal, 
      id, 
      createdAt: now,
      tags: insertMeal.tags || null,
      category: insertMeal.category || null
    };
    this.meals.set(id, meal);
    return meal;
  }

  async updateMeal(id: number, mealData: Partial<Meal>): Promise<Meal> {
    const meal = await this.getMeal(id);
    if (!meal) {
      throw new Error('Meal not found');
    }
    
    const updatedMeal = { ...meal, ...mealData };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<void> {
    this.meals.delete(id);
    
    // Delete associated weekMeals
    for (const [wmId, wm] of this.weekMeals.entries()) {
      if (wm.mealId === id) {
        this.weekMeals.delete(wmId);
      }
    }
  }
  
  async getAllMeals(): Promise<Meal[]> {
    return Array.from(this.meals.values());
  }

  // Week methods
  async getWeek(id: number): Promise<Week | undefined> {
    return this.weeks.get(id);
  }

  async getWeeks(): Promise<Week[]> {
    return Array.from(this.weeks.values());
  }

  async getCurrentWeek(): Promise<Week | undefined> {
    const now = new Date();
    return Array.from(this.weeks.values()).find(
      (week) => week.isActive && now >= week.startDate && now <= week.endDate
    );
  }

  async createWeek(insertWeek: InsertWeek): Promise<Week> {
    const id = this.currentWeekId++;
    const now = new Date();
    const week: Week = { 
      ...insertWeek, 
      id, 
      createdAt: now,
      isActive: insertWeek.isActive || null,
      isSelectable: insertWeek.isSelectable || null
    };
    this.weeks.set(id, week);
    return week;
  }

  async updateWeek(id: number, weekData: Partial<Week>): Promise<Week> {
    const week = await this.getWeek(id);
    if (!week) {
      throw new Error('Week not found');
    }
    
    const updatedWeek = { ...week, ...weekData };
    this.weeks.set(id, updatedWeek);
    return updatedWeek;
  }

  // WeekMeal methods
  async addMealToWeek(insertWeekMeal: InsertWeekMeal): Promise<WeekMeal> {
    const id = this.currentWeekMealId++;
    const now = new Date();
    const weekMeal: WeekMeal = { 
      ...insertWeekMeal, 
      id, 
      createdAt: now,
      isAvailable: insertWeekMeal.isAvailable || null,
      isFeatured: insertWeekMeal.isFeatured || null,
      sortOrder: insertWeekMeal.sortOrder || null
    };
    this.weekMeals.set(id, weekMeal);
    return weekMeal;
  }

  async removeMealFromWeek(weekId: number, mealId: number): Promise<void> {
    for (const [id, wm] of [...this.weekMeals.entries()]) {
      if (wm.weekId === weekId && wm.mealId === mealId) {
        this.weekMeals.delete(id);
        return;
      }
    }
  }

  async getWeekMeals(weekId: number): Promise<WeekMeal[]> {
    return Array.from(this.weekMeals.values()).filter(
      (wm) => wm.weekId === weekId
    );
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId
    );
  }

  async getOrderByUserAndWeek(userId: number, weekId: number): Promise<any | undefined> {
    const order = Array.from(this.orders.values()).find(
      (order) => order.userId === userId && order.weekId === weekId
    );
    
    if (!order) {
      return undefined;
    }
    
    // Get order items
    const items = await this.getOrderItems(order.id);
    
    // Get meals for each item
    const fullItems = await Promise.all(
      items.map(async (item) => {
        return {
          mealId: item.mealId,
          portionSize: item.portionSize
        };
      })
    );
    
    return {
      ...order,
      items: fullItems
    };
  }

  async getPendingOrderByUser(userId: number): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.userId === userId && order.status === 'pending'
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const now = new Date();
    const order: Order = { 
      ...insertOrder, 
      id, 
      createdAt: now, 
      updatedAt: now,
      status: insertOrder.status || null,
      deliveryDate: insertOrder.deliveryDate || null,
      deliveryAddress: insertOrder.deliveryAddress || null,
      deliveryNotes: insertOrder.deliveryNotes || null
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order> {
    const order = await this.getOrder(id);
    if (!order) {
      throw new Error('Order not found');
    }
    
    const now = new Date();
    const updatedOrder = { ...order, ...orderData, updatedAt: now };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
  
  async getOrdersByWeek(weekId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.weekId === weekId
    );
  }

  // OrderItem methods
  async getOrderItems(orderId: number): Promise<OrderItemFull[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );
  }

  async addOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItemFull> {
    const id = this.currentOrderItemId++;
    const now = new Date();
    const orderItem: OrderItemFull = { ...insertOrderItem, id, createdAt: now };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }

  async removeOrderItem(itemId: number): Promise<void> {
    this.orderItems.delete(itemId);
  }

  // Order status management methods
  async skipOrder(orderId: number): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    const updatedOrder = {
      ...order,
      previousStatus: order.status,
      status: "skipped" as const,
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  async unskipOrder(orderId: number): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    if (order.status !== "skipped") {
      throw new Error(`Order ${orderId} is not in skipped status`);
    }

    const updatedOrder = {
      ...order,
      status: (order.previousStatus || "not_selected") as const,
      previousStatus: null,
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  async markOrderAsSelected(orderId: number): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    if (order.status === "skipped") {
      throw new Error(`Cannot mark skipped order as selected`);
    }

    const updatedOrder = {
      ...order,
      status: "selected" as const,
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }
}

// Import database storage implementation
import { DatabaseStorage } from './database-storage';

// Use database storage instead of in-memory storage
export const storage = new DatabaseStorage();
