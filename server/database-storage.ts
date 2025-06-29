import { db } from "./db";
import { and, eq, inArray, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { users, admins, meals, weeks, weekMeals, orders, orderItems, userWeekStatuses, neighborhoods, invitationCodes, waitlist, pricingConfigs } from "@shared/schema";
import type { 
  User, InsertUser, 
  Admin, InsertAdmin,
  Meal, InsertMeal, 
  Week, InsertWeek, 
  WeekMeal, InsertWeekMeal, 
  Order, InsertOrder, 
  OrderItemFull, InsertOrderItem, 
  UserWeekStatus, InsertUserWeekStatus,
  Neighborhood, InsertNeighborhood,
  InvitationCode, InsertInvitationCode,
  WaitlistEntry, InsertWaitlistEntry,
  PricingConfig, InsertPricingConfig,
  IStorage 
} from "@shared/schema";

export class DatabaseStorage implements IStorage {
  // UserWeekStatus methods
  async getUserWeekStatus(userId: number, weekId: number): Promise<UserWeekStatus | undefined> {
    const [status] = await db
      .select()
      .from(userWeekStatuses)
      .where(and(
        eq(userWeekStatuses.userId, userId),
        eq(userWeekStatuses.weekId, weekId)
      ));
    return status;
  }
  
  async getUserWeekStatuses(userId: number): Promise<UserWeekStatus[]> {
    return await db
      .select()
      .from(userWeekStatuses)
      .where(eq(userWeekStatuses.userId, userId));
  }
  
  async setUserWeekStatus(insertUserWeekStatus: InsertUserWeekStatus): Promise<UserWeekStatus> {
    // Check if a status already exists for this user and week
    const existingStatus = await this.getUserWeekStatus(
      insertUserWeekStatus.userId,
      insertUserWeekStatus.weekId
    );
    
    if (existingStatus) {
      // Update the existing record
      const now = new Date();
      const [updatedStatus] = await db
        .update(userWeekStatuses)
        .set({
          isSkipped: insertUserWeekStatus.isSkipped,
          updatedAt: now
        })
        .where(eq(userWeekStatuses.id, existingStatus.id))
        .returning();
        
      return updatedStatus;
    } else {
      // Insert a new record
      const [newStatus] = await db
        .insert(userWeekStatuses)
        .values(insertUserWeekStatus)
        .returning();
        
      return newStatus;
    }
  }
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User not found: ${id}`);
    }
    
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin> {
    const [admin] = await db.update(admins).set(adminData).where(eq(admins.id, id)).returning();
    return admin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  // Meal methods
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal;
  }

  async getMealsByWeek(weekId: number): Promise<Meal[]> {
    const weekMealsList = await db
      .select()
      .from(weekMeals)
      .where(
        and(
          eq(weekMeals.weekId, weekId),
          eq(weekMeals.isAvailable, true)
        )
      );
    
    const mealIds = weekMealsList.map(wm => wm.mealId);
    
    if (mealIds.length === 0) {
      return [];
    }
    
    // Query meals by IDs
    return await db
      .select()
      .from(meals)
      .where(inArray(meals.id, mealIds));
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const [meal] = await db.insert(meals).values(insertMeal).returning();
    return meal;
  }

  async updateMeal(id: number, mealData: Partial<Meal>): Promise<Meal> {
    const [updatedMeal] = await db
      .update(meals)
      .set(mealData)
      .where(eq(meals.id, id))
      .returning();
    
    if (!updatedMeal) {
      throw new Error(`Meal not found: ${id}`);
    }
    
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<void> {
    // First remove from weekMeals table
    await db
      .delete(weekMeals)
      .where(eq(weekMeals.mealId, id));
    
    // Then delete the meal
    await db
      .delete(meals)
      .where(eq(meals.id, id));
  }

  async getAllMeals(): Promise<Meal[]> {
    return await db.select().from(meals);
  }

  // Week methods
  async getWeek(id: number): Promise<Week | undefined> {
    const [week] = await db.select().from(weeks).where(eq(weeks.id, id));
    return week;
  }

  async getWeeks(): Promise<Week[]> {
    return await db.select().from(weeks);
  }

  async getCurrentWeek(): Promise<Week | undefined> {
    const [week] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.isActive, true))
      .limit(1);
    
    return week;
  }

  async createWeek(insertWeek: InsertWeek): Promise<Week> {
    const [week] = await db.insert(weeks).values(insertWeek).returning();
    return week;
  }

  async updateWeek(id: number, weekData: Partial<Week>): Promise<Week> {
    const [updatedWeek] = await db
      .update(weeks)
      .set(weekData)
      .where(eq(weeks.id, id))
      .returning();
    
    if (!updatedWeek) {
      throw new Error(`Week not found: ${id}`);
    }
    
    return updatedWeek;
  }

  // WeekMeal methods
  async addMealToWeek(insertWeekMeal: InsertWeekMeal): Promise<WeekMeal> {
    const [weekMeal] = await db.insert(weekMeals).values(insertWeekMeal).returning();
    return weekMeal;
  }

  async removeMealFromWeek(weekId: number, mealId: number): Promise<void> {
    await db
      .delete(weekMeals)
      .where(
        and(
          eq(weekMeals.weekId, weekId),
          eq(weekMeals.mealId, mealId)
        )
      );
  }

  async getWeekMeals(weekId: number): Promise<WeekMeal[]> {
    return await db
      .select()
      .from(weekMeals)
      .where(eq(weekMeals.weekId, weekId));
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId));
  }

  async getOrderByUserAndWeek(userId: number, weekId: number): Promise<any | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.weekId, weekId)
        )
      );
    
    if (!order) return undefined;
    
    // Get order items
    const orderItemsList = await this.getOrderItems(order.id);
    
    return {
      ...order,
      items: orderItemsList.map(item => ({
        mealId: item.mealId,
        portionSize: item.portionSize
      }))
    };
  }

  async getPendingOrderByUser(userId: number): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          or(
            eq(orders.status, 'not_selected'),
            eq(orders.status, 'selected')
          )
        )
      )
      .limit(1);
    
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order> {
    // Add updated timestamp
    const updateData = {
      ...orderData,
      updatedAt: new Date()
    };
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    
    if (!updatedOrder) {
      throw new Error(`Order not found: ${id}`);
    }
    
    return updatedOrder;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrdersByWeek(weekId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.weekId, weekId));
  }

  // OrderItem methods
  async getOrderItems(orderId: number): Promise<OrderItemFull[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async addOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItemFull> {
    const [orderItem] = await db.insert(orderItems).values(insertOrderItem).returning();
    return orderItem;
  }

  async updateOrderItem(itemId: number, updates: Partial<OrderItemFull>): Promise<OrderItemFull> {
    const [updatedItem] = await db
      .update(orderItems)
      .set(updates)
      .where(eq(orderItems.id, itemId))
      .returning();
    return updatedItem;
  }

  async removeOrderItem(itemId: number): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, itemId));
  }

  // Seed data method - call this to initialize the database with sample data
  async seedInitialData(): Promise<void> {
    // Check if we already have data
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed");
      return;
    }

    console.log("Seeding initial data...");

    // Create admin
    const admin = await this.createAdmin({
      username: "admin",
      password: "$2a$10$h.dl5J86rGH7I8bD9bZeZe68djXiTFjj4krTUe.fNbjQsP9vdhnda", // 'password'
      email: "admin@example.com",
      name: "Admin User",
      role: "super_admin",
      permissions: ["all"]
    });

    // Create regular user
    const user = await this.createUser({
      username: "user",
      password: "$2a$10$h.dl5J86rGH7I8bD9bZeZe68djXiTFjj4krTUe.fNbjQsP9vdhnda", // 'password'
      email: "user@example.com",
      name: "Regular User",
      phone: "+201234567890",
      address: JSON.stringify({
        street: "Cairo Street",
        building: "123",
        apartment: "4B",
        area: "Nasr City",
        landmark: "Near Cairo Mall"
      })
    });

    // Create weeks
    const currentWeek = await this.createWeek({
      identifier: "current",
      label: "May 12-18, 2025",
      startDate: new Date("2025-05-12"),
      endDate: new Date("2025-05-18"),
      orderDeadline: new Date("2025-05-10"),
      deliveryDate: new Date("2025-05-12"),
      isActive: true,
      isSelectable: true
    });

    const nextWeek = await this.createWeek({
      identifier: "next",
      label: "May 19-25, 2025",
      startDate: new Date("2025-05-19"),
      endDate: new Date("2025-05-25"),
      orderDeadline: new Date("2025-05-17"),
      deliveryDate: new Date("2025-05-19"),
      isActive: true,
      isSelectable: true
    });

    // Create meals
    const mealsToCreate = [
      {
        title: "Herb Grilled Chicken",
        description: "Juicy grilled chicken breast marinated in herbs and garlic, served with roasted vegetables and quinoa.",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop",
        calories: 420,
        protein: 32,
        price: 209,
        tags: ["protein", "low-carb", "gluten-free"],
        category: "Main Dishes"
      },
      {
        title: "Mediterranean Salmon Bowl",
        description: "Fresh grilled salmon served over a bed of mixed greens, tomatoes, cucumbers, olives, feta cheese, and lemon tahini dressing.",
        imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop",
        calories: 490,
        protein: 36,
        price: 229,
        tags: ["protein", "omega-3", "pescatarian"],
        category: "Bowls"
      },
      {
        title: "Quinoa Veggie Bowl",
        description: "Nutrient-rich bowl with tricolor quinoa, roasted sweet potatoes, kale, avocado, and pumpkin seeds with a zesty lemon vinaigrette.",
        imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=1000&auto=format&fit=crop",
        calories: 380,
        protein: 14,
        price: 189,
        tags: ["vegetarian", "plant-based", "high-fiber"],
        category: "Vegetarian"
      },
      {
        title: "Thai Turkey Meatballs",
        description: "Lean turkey meatballs infused with Thai spices, served with brown rice and steamed vegetables.",
        imageUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468?q=80&w=1000&auto=format&fit=crop",
        calories: 410,
        protein: 28,
        price: 199,
        tags: ["protein", "low-fat", "asian-inspired"],
        category: "Main Dishes"
      },
      {
        title: "Shrimp and Broccoli Stir Fry",
        description: "Wild-caught shrimp with broccoli, bell peppers, and carrots in a ginger-garlic sauce, served over brown rice.",
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1000&auto=format&fit=crop",
        calories: 360,
        protein: 24,
        price: 219,
        tags: ["protein", "pescatarian", "asian-inspired"],
        category: "Bowls"
      },
      {
        title: "Classic Beef Burger",
        description: "Grass-fed beef patty with lettuce, tomato, and special sauce on a whole-grain bun. Served with sweet potato fries.",
        imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=1000&auto=format&fit=crop",
        calories: 650,
        protein: 35,
        price: 239,
        tags: ["protein", "beef", "classic"],
        category: "Main Dishes"
      },
      {
        title: "Spinach & Feta Omelette",
        description: "Fluffy egg omelette filled with sautéed spinach, feta cheese, and cherry tomatoes. Served with whole-grain toast.",
        imageUrl: "https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=1000&auto=format&fit=crop",
        calories: 340,
        protein: 22,
        price: 179,
        tags: ["vegetarian", "breakfast", "high-protein"],
        category: "Breakfast"
      },
      {
        title: "Mexican Bean Bowl",
        description: "Black beans, brown rice, grilled corn, bell peppers, avocado, and pico de gallo with a lime cilantro dressing.",
        imageUrl: "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?q=80&w=1000&auto=format&fit=crop",
        calories: 420,
        protein: 16,
        price: 189,
        tags: ["vegan", "plant-based", "high-fiber"],
        category: "Vegetarian"
      }
    ];

    const createdMeals: Meal[] = [];
    for (const mealData of mealsToCreate) {
      const meal = await this.createMeal(mealData);
      createdMeals.push(meal);
    }

    // Associate meals with weeks
    for (const meal of createdMeals) {
      await this.addMealToWeek({
        weekId: currentWeek.id,
        mealId: meal.id,
        isAvailable: true,
        isFeatured: [1, 2, 3].includes(meal.id)
      });

      await this.addMealToWeek({
        weekId: nextWeek.id,
        mealId: meal.id,
        isAvailable: true,
        isFeatured: [4, 5, 6].includes(meal.id)
      });
    }

    console.log("Database seeded successfully!");
  }

  // Order status management methods
  async skipOrder(orderId: number): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        previousStatus: order.status,
        status: "skipped",
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  async unskipOrder(orderId: number): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    if (order.status !== "skipped") {
      throw new Error(`Order ${orderId} is not in skipped status`);
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: order.previousStatus || "not_selected",
        previousStatus: null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  async markOrderAsSelected(orderId: number): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    // Only update if not already selected and not skipped
    if (order.status === "skipped") {
      throw new Error(`Cannot mark skipped order as selected`);
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "selected",
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  // Neighborhood methods
  async getAllNeighborhoods(): Promise<Neighborhood[]> {
    return await db.select().from(neighborhoods);
  }

  async getServicedNeighborhoods(): Promise<Neighborhood[]> {
    return await db
      .select()
      .from(neighborhoods)
      .where(eq(neighborhoods.isServiced, true));
  }

  async createNeighborhood(insertNeighborhood: InsertNeighborhood): Promise<Neighborhood> {
    const [neighborhood] = await db
      .insert(neighborhoods)
      .values(insertNeighborhood)
      .returning();
    return neighborhood;
  }

  async updateNeighborhood(id: number, neighborhoodData: Partial<Neighborhood>): Promise<Neighborhood> {
    const [updatedNeighborhood] = await db
      .update(neighborhoods)
      .set(neighborhoodData)
      .where(eq(neighborhoods.id, id))
      .returning();
    return updatedNeighborhood;
  }

  async deleteNeighborhood(id: number): Promise<void> {
    await db.delete(neighborhoods).where(eq(neighborhoods.id, id));
  }

  // Invitation code methods
  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    return await db.select().from(invitationCodes);
  }

  async getActiveInvitationCodes(): Promise<InvitationCode[]> {
    return await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.isActive, true));
  }

  async validateInvitationCode(code: string): Promise<InvitationCode | null> {
    const [invitationCode] = await db
      .select()
      .from(invitationCodes)
      .where(and(
        eq(invitationCodes.code, code),
        eq(invitationCodes.isActive, true)
      ));

    if (!invitationCode) return null;

    // Check if code has reached max uses
    if (invitationCode.maxUses !== null && invitationCode.currentUses >= invitationCode.maxUses) {
      return null;
    }

    return invitationCode;
  }

  async createInvitationCode(insertInvitationCode: InsertInvitationCode): Promise<InvitationCode> {
    const [invitationCode] = await db
      .insert(invitationCodes)
      .values(insertInvitationCode)
      .returning();
    return invitationCode;
  }

  async updateInvitationCode(id: number, codeData: Partial<InvitationCode>): Promise<InvitationCode> {
    const [updatedCode] = await db
      .update(invitationCodes)
      .set(codeData)
      .where(eq(invitationCodes.id, id))
      .returning();
    return updatedCode;
  }

  async deleteInvitationCode(id: number): Promise<void> {
    await db.delete(invitationCodes).where(eq(invitationCodes.id, id));
  }

  async incrementCodeUsage(code: string): Promise<InvitationCode> {
    // First get the current code
    const [currentCode] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code));
    
    if (!currentCode) {
      throw new Error("Invitation code not found");
    }

    // Increment the usage count
    const [updatedCode] = await db
      .update(invitationCodes)
      .set({
        currentUses: currentCode.currentUses + 1
      })
      .where(eq(invitationCodes.code, code))
      .returning();
    return updatedCode;
  }

  // Waitlist methods
  async getAllWaitlistEntries(): Promise<WaitlistEntry[]> {
    return await db.select().from(waitlist);
  }

  async addToWaitlist(insertWaitlistEntry: InsertWaitlistEntry): Promise<WaitlistEntry> {
    const [waitlistEntry] = await db
      .insert(waitlist)
      .values(insertWaitlistEntry)
      .returning();
    return waitlistEntry;
  }

  async removeFromWaitlist(id: number): Promise<void> {
    await db.delete(waitlist).where(eq(waitlist.id, id));
  }

  // Seed initial data for pre-onboarding system
  async seedPreOnboardingData(): Promise<void> {
    try {
      // Check if we already have neighborhoods
      const existingNeighborhoods = await this.getAllNeighborhoods();
      if (existingNeighborhoods.length === 0) {
        // Add Cairo neighborhoods - some serviced, some not
        const cairoNeighborhoods = [
          { name: "Zamalek", isServiced: true },
          { name: "Maadi", isServiced: true }, 
          { name: "New Cairo", isServiced: true },
          { name: "Heliopolis", isServiced: false },
          { name: "Mohandessin", isServiced: false },
          { name: "Downtown", isServiced: false },
          { name: "Dokki", isServiced: false },
          { name: "Giza", isServiced: false },
          { name: "Nasr City", isServiced: false },
          { name: "Rehab", isServiced: false }
        ];

        for (const neighborhood of cairoNeighborhoods) {
          await this.createNeighborhood(neighborhood);
        }
        console.log('Seeded neighborhoods');
      }

      // Check if we already have invitation codes
      const existingCodes = await this.getAllInvitationCodes();
      if (existingCodes.length === 0) {
        // Add initial invitation codes
        const initialCodes = [
          { code: "WAGBA2025", isActive: true, maxUses: 100, description: "Launch week - General access" },
          { code: "EARLY50", isActive: true, maxUses: 50, description: "Early adopters batch" },
          { code: "VIP25", isActive: true, maxUses: 25, description: "VIP launch access" }
        ];

        for (const code of initialCodes) {
          await this.createInvitationCode(code);
        }
        console.log('Seeded invitation codes');
      }
    } catch (error) {
      console.error('Error seeding pre-onboarding data:', error);
    }
  }

  // Pricing Configuration methods
  async getAllPricingConfigs(): Promise<PricingConfig[]> {
    return await db.select().from(pricingConfigs);
  }

  async getPricingConfigsByType(configType: string): Promise<PricingConfig[]> {
    return await db
      .select()
      .from(pricingConfigs)
      .where(eq(pricingConfigs.configType, configType));
  }

  async getPricingConfig(configType: string, configKey: string): Promise<PricingConfig | undefined> {
    const [config] = await db
      .select()
      .from(pricingConfigs)
      .where(and(
        eq(pricingConfigs.configType, configType),
        eq(pricingConfigs.configKey, configKey)
      ));
    return config;
  }

  async createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig> {
    const [newConfig] = await db
      .insert(pricingConfigs)
      .values(config)
      .returning();
    return newConfig;
  }

  async updatePricingConfig(id: number, configData: Partial<PricingConfig>): Promise<PricingConfig> {
    const now = new Date();
    const [updatedConfig] = await db
      .update(pricingConfigs)
      .set({ ...configData, updatedAt: now })
      .where(eq(pricingConfigs.id, id))
      .returning();
    
    if (!updatedConfig) {
      throw new Error(`Pricing config not found: ${id}`);
    }
    return updatedConfig;
  }

  async deletePricingConfig(id: number): Promise<void> {
    await db.delete(pricingConfigs).where(eq(pricingConfigs.id, id));
  }
}