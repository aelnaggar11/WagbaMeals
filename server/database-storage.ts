import { db } from "./db";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { users, meals, weeks, weekMeals, orders, orderItems } from "@shared/schema";
import type { User, InsertUser, Meal, InsertMeal, Week, InsertWeek, WeekMeal, InsertWeekMeal, Order, InsertOrder, OrderItemFull, InsertOrderItem, IStorage } from "@shared/schema";

export class DatabaseStorage implements IStorage {
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
          eq(orders.status, 'pending')
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

  // Seed data method - call this to initialize the database with sample data
  async seedInitialData(): Promise<void> {
    // Check if we already have data
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed");
      return;
    }

    console.log("Seeding initial data...");

    // Create admin user
    const admin = await this.createUser({
      username: "admin",
      password: "$2a$10$h.dl5J86rGH7I8bD9bZeZe68djXiTFjj4krTUe.fNbjQsP9vdhnda", // 'password'
      email: "admin@example.com",
      name: "Admin User",
      isAdmin: true
    });

    // Create regular user
    const user = await this.createUser({
      username: "user",
      password: "$2a$10$h.dl5J86rGH7I8bD9bZeZe68djXiTFjj4krTUe.fNbjQsP9vdhnda", // 'password'
      email: "user@example.com",
      name: "Regular User",
      address: JSON.stringify({
        street: "Cairo Street",
        building: "123",
        apartment: "4B",
        area: "Nasr City",
        landmark: "Near Cairo Mall",
        phone: "+201234567890"
      })
    });

    // Create weeks
    const currentWeek = await this.createWeek({
      identifier: "current",
      label: "May 12-18, 2025",
      startDate: new Date("2025-05-12"),
      endDate: new Date("2025-05-18"),
      orderDeadline: new Date("2025-05-10"),
      deliveryDate: "Monday, May 12, 2025",
      isActive: true,
      isSelectable: true
    });

    const nextWeek = await this.createWeek({
      identifier: "next",
      label: "May 19-25, 2025",
      startDate: new Date("2025-05-19"),
      endDate: new Date("2025-05-25"),
      orderDeadline: new Date("2025-05-17"),
      deliveryDate: "Monday, May 19, 2025",
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
}