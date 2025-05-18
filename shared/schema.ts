import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { getPriceForMealCount } from "../client/src/lib/utils";

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  isAdmin: true,
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

export const insertWeekMealSchema = createInsertSchema(weekMeals).pick({
  weekId: true,
  mealId: true,
  isAvailable: true,
  isFeatured: true,
  sortOrder: true,
});

// Order Model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekId: integer("week_id").notNull(),
  status: text("status").default("pending"),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

export type PortionSize = "standard" | "large";

// Helper functions for pricing
export { getPriceForMealCount };
