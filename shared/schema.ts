import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { getPriceForMealCount } from "../client/src/lib/utils";

// User Model (for customers only)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
});

// Admin Model (completely separate from users)
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  role: text("role").default("admin"), // admin, super_admin, etc.
  permissions: text("permissions").array().default(["orders", "meals", "users", "weeks"]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
});

// Meal Model
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  price: integer("price").notNull(),
  tags: text("tags").array(),
  category: text("category").default("Main Dishes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMealSchema = createInsertSchema(meals).pick({
  title: true,
  description: true,
  imageUrl: true,
  calories: true,
  protein: true,
  price: true,
  tags: true,
  category: true,
});

// Week Model
export const weeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(), // e.g. "2023-W32"
  label: text("label").notNull(), // e.g. "July 24 - July 30"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  orderDeadline: timestamp("order_deadline").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  isActive: boolean("is_active").default(true),
  isSelectable: boolean("is_selectable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeekSchema = createInsertSchema(weeks).pick({
  identifier: true,
  label: true,
  startDate: true,
  endDate: true,
  orderDeadline: true,
  deliveryDate: true,
  isActive: true,
  isSelectable: true,
});

// WeekMeal Model (Association between weeks and meals)
export const weekMeals = pgTable("week_meals", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull(),
  mealId: integer("meal_id").notNull(),
  isAvailable: boolean("is_available").default(true),
  isFeatured: boolean("is_featured").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// UserWeekStatus Model (Tracks if a user has skipped a week)
export const userWeekStatuses = pgTable("user_week_statuses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekId: integer("week_id").notNull(),
  isSkipped: boolean("is_skipped").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWeekMealSchema = createInsertSchema(weekMeals).pick({
  weekId: true,
  mealId: true,
  isAvailable: true,
  isFeatured: true,
  sortOrder: true,
});

export const insertUserWeekStatusSchema = createInsertSchema(userWeekStatuses).pick({
  userId: true,
  weekId: true,
  isSkipped: true,
});

// Order Model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekId: integer("week_id").notNull(),
  status: text("status").default("not_selected"),
  previousStatus: text("previous_status"), // For tracking status before skipping
  delivered: boolean("delivered").default(false), // Separate delivery tracking
  mealCount: integer("meal_count").notNull(),
  defaultPortionSize: text("default_portion_size").notNull(),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull(),
  total: real("total").notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),
  paymentMethod: text("payment_method"),
  deliveryDate: text("delivery_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  weekId: true,
  status: true,
  mealCount: true,
  defaultPortionSize: true,
  subtotal: true,
  discount: true,
  total: true,
  deliveryAddress: true,
  deliveryNotes: true,
  paymentMethod: true,
  deliveryDate: true,
});

// OrderItem Model
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  mealId: integer("meal_id").notNull(),
  portionSize: text("portion_size").notNull(),
  price: real("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  mealId: true,
  portionSize: true,
  price: true,
});

// Neighborhood Model (for service areas)
export const neighborhoods = pgTable("neighborhoods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isServiced: boolean("is_serviced").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNeighborhoodSchema = createInsertSchema(neighborhoods).pick({
  name: true,
  isServiced: true,
});

// Invitation Code Model (for controlling onboarding capacity)
export const invitationCodes = pgTable("invitation_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").default(true),
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvitationCodeSchema = createInsertSchema(invitationCodes).pick({
  code: true,
  isActive: true,
  maxUses: true,
  description: true,
});

// Waitlist Model (for users who don't qualify initially)
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  neighborhood: text("neighborhood").notNull(),
  rejectionReason: text("rejection_reason"), // "invalid_code" | "area_not_serviced"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).pick({
  email: true,
  neighborhood: true,
  rejectionReason: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type Week = typeof weeks.$inferSelect;
export type InsertWeek = z.infer<typeof insertWeekSchema>;

export type WeekMeal = typeof weekMeals.$inferSelect;
export type InsertWeekMeal = z.infer<typeof insertWeekMealSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = {
  mealId: number;
  portionSize: PortionSize;
};

export type OrderItemFull = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type UserWeekStatus = typeof userWeekStatuses.$inferSelect;
export type InsertUserWeekStatus = z.infer<typeof insertUserWeekStatusSchema>;

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = z.infer<typeof insertNeighborhoodSchema>;

export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;

export type WaitlistEntry = typeof waitlist.$inferSelect;
export type InsertWaitlistEntry = z.infer<typeof insertWaitlistSchema>;

export type PortionSize = "standard" | "large" | "mixed";

export type OrderStatus = "not_selected" | "selected" | "skipped" | "cancelled";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Admin methods (completely separate from users)
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin>;
  getAllAdmins(): Promise<Admin[]>;
  
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
  removeOrderItem(itemId: number): Promise<void>;
  
  // UserWeekStatus methods
  getUserWeekStatus(userId: number, weekId: number): Promise<UserWeekStatus | undefined>;
  setUserWeekStatus(userWeekStatus: InsertUserWeekStatus): Promise<UserWeekStatus>;
  getUserWeekStatuses(userId: number): Promise<UserWeekStatus[]>;
  
  // Order status management methods
  skipOrder(orderId: number): Promise<Order>;
  unskipOrder(orderId: number): Promise<Order>;
  markOrderAsSelected(orderId: number): Promise<Order>;
}

// Helper functions for pricing
export { getPriceForMealCount };
