import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Model (for customers only)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  subscriptionStatus: text("subscription_status").default("active"), // "active", "cancelled", "paused", "suspended"
  subscriptionPausedAt: timestamp("subscription_paused_at"),
  subscriptionCancelledAt: timestamp("subscription_cancelled_at"),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  hasUsedTrialBox: boolean("has_used_trial_box").default(false), // Track if user has used trial box
  userType: text("user_type").default("trial"), // "trial", "subscription"
  isSubscriber: boolean("is_subscriber").default(false), // Whether user is a subscriber
  paymobSubscriptionId: text("paymob_subscription_id"), // Paymob subscription ID (string like "pi_test_...")
  paymobPlanId: text("paymob_plan_id"), // Paymob subscription plan ID (string or number)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  subscriptionStatus: true,
  subscriptionPausedAt: true,
  subscriptionCancelledAt: true,
  subscriptionStartedAt: true,
  hasUsedTrialBox: true,
  userType: true,
  isSubscriber: true,
  paymobSubscriptionId: true,
  paymobPlanId: true,
});

// Admin Model (completely separate from users)
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  role: text("role").default("admin"), // "admin" or "super_admin"
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
}).extend({
  role: z.enum(["admin", "super_admin"]).default("admin"),
});

// Admin role type for better type checking
export const AdminRole = {
  ADMIN: "admin" as const,
  SUPER_ADMIN: "super_admin" as const,
} as const;

export type AdminRoleType = typeof AdminRole[keyof typeof AdminRole];

// Meal Model
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  caloriesLarge: integer("calories_large").notNull(),
  proteinLarge: integer("protein_large").notNull(),
  ingredients: text("ingredients"), // New ingredients field
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
  caloriesLarge: true,
  proteinLarge: true,
  ingredients: true,
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
  deliverySlot: text("delivery_slot").default("morning"), // "morning" | "evening"
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"), // "pending" | "processing" | "confirmed" | "failed"
  paymentConfirmationImage: text("payment_confirmation_image"), // URL to uploaded payment confirmation
  paymobTransactionId: text("paymob_transaction_id"), // Paymob transaction reference
  paymobOrderId: text("paymob_order_id"), // Paymob order ID (from webhooks)
  deliveryDate: text("delivery_date"),
  orderType: text("order_type").default("trial"), // "trial", "subscription"
  // Subscription payment tracking fields
  subscriptionBillingAttemptedAt: timestamp("subscription_billing_attempted_at"), // When auto-charge was attempted
  subscriptionBillingStatus: text("subscription_billing_status"), // "pending" | "success" | "failed" | "skipped"
  subscriptionBillingError: text("subscription_billing_error"), // Error message if billing failed
  subscriptionBillingRetryCount: integer("subscription_billing_retry_count").default(0), // Number of billing retry attempts
  paymentMethodId: integer("payment_method_id"), // Reference to payment_methods table for subscriptions
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
  deliverySlot: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentConfirmationImage: true,
  deliveryDate: true,
  orderType: true,
  subscriptionBillingAttemptedAt: true,
  subscriptionBillingStatus: true,
  subscriptionBillingError: true,
  subscriptionBillingRetryCount: true,
  paymentMethodId: true,
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

// Pricing Configuration Model (for dynamic meal bundle and delivery pricing)
export const pricingConfigs = pgTable("pricing_configs", {
  id: serial("id").primaryKey(),
  configType: text("config_type").notNull(), // "meal_bundle" | "delivery"
  configKey: text("config_key").notNull(), // "4_meals", "5_meals", etc. or "base_delivery"
  price: real("price").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfigs).pick({
  configType: true,
  configKey: true,
  price: true,
  description: true,
  isActive: true,
});

// Password Reset Tokens Model
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
  usedAt: true,
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

export type PricingConfig = typeof pricingConfigs.$inferSelect;
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type PortionSize = "standard" | "large" | "mixed";
export type DeliverySlot = "morning" | "evening";

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

  // Subscription management methods
  cancelUserSubscription(userId: number): Promise<User>;
  resumeUserSubscription(userId: number): Promise<User>;
  
  // Password reset token methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;
  
  // Landing page content methods
  getLandingHero(): Promise<LandingHero | undefined>;
  createLandingHero(hero: InsertLandingHero): Promise<LandingHero>;
  updateLandingHero(id: number, hero: Partial<LandingHero>): Promise<LandingHero>;
  
  getLandingCarouselMeals(): Promise<LandingCarouselMeal[]>;
  createLandingCarouselMeal(meal: InsertLandingCarouselMeal): Promise<LandingCarouselMeal>;
  updateLandingCarouselMeal(id: number, meal: Partial<LandingCarouselMeal>): Promise<LandingCarouselMeal>;
  deleteLandingCarouselMeal(id: number): Promise<void>;
  
  getLandingFaqs(): Promise<LandingFaq[]>;
  createLandingFaq(faq: InsertLandingFaq): Promise<LandingFaq>;
  updateLandingFaq(id: number, faq: Partial<LandingFaq>): Promise<LandingFaq>;
  deleteLandingFaq(id: number): Promise<void>;
}

// Landing Page Content Models
export const landingHero = pgTable("landing_hero", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  backgroundImageUrl: text("background_image_url"),
  ctaText: text("cta_text").default("Get Started"),
  ctaUrl: text("cta_url").default("/"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const landingCarouselMeals = pgTable("landing_carousel_meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const landingFaqs = pgTable("landing_faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Landing page insert schemas
export const insertLandingHeroSchema = createInsertSchema(landingHero).pick({
  title: true,
  subtitle: true,
  backgroundImageUrl: true,
  ctaText: true,
  ctaUrl: true,
  isActive: true,
});

export const insertLandingCarouselMealSchema = createInsertSchema(landingCarouselMeals).pick({
  name: true,
  description: true,
  imageUrl: true,
  displayOrder: true,
  isActive: true,
});

export const insertLandingFaqSchema = createInsertSchema(landingFaqs).pick({
  question: true,
  answer: true,
  displayOrder: true,
  isActive: true,
});

// Landing page types
export type LandingHero = typeof landingHero.$inferSelect;
export type InsertLandingHero = z.infer<typeof insertLandingHeroSchema>;

export type LandingCarouselMeal = typeof landingCarouselMeals.$inferSelect;
export type InsertLandingCarouselMeal = z.infer<typeof insertLandingCarouselMealSchema>;

export type LandingFaq = typeof landingFaqs.$inferSelect;
export type InsertLandingFaq = z.infer<typeof insertLandingFaqSchema>;

// Payment Methods Model (for storing tokenized card data for subscriptions)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymobCardToken: text("paymob_card_token").notNull(), // Tokenized card from Paymob
  maskedPan: text("masked_pan"), // Last 4 digits for display (e.g., "**** 4242")
  cardBrand: text("card_brand"), // "visa", "mastercard", etc.
  expiryMonth: text("expiry_month"),
  expiryYear: text("expiry_year"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
  userId: true,
  paymobCardToken: true,
  maskedPan: true,
  cardBrand: true,
  expiryMonth: true,
  expiryYear: true,
  isDefault: true,
  isActive: true,
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// Helper functions for pricing
