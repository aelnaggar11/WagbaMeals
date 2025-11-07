CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin',
	"permissions" text[] DEFAULT '{"orders","meals","users","weeks"}',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_username_unique" UNIQUE("username"),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "invitation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitation_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "landing_carousel_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_hero" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"background_image_url" text,
	"cta_text" text DEFAULT 'Get Started',
	"cta_url" text DEFAULT '/',
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" integer NOT NULL,
	"calories_large" integer NOT NULL,
	"protein_large" integer NOT NULL,
	"ingredients" text,
	"tags" text[],
	"category" text DEFAULT 'Main Dishes',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_serviced" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "neighborhoods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"meal_id" integer NOT NULL,
	"portion_size" text NOT NULL,
	"price" real NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"status" text DEFAULT 'not_selected',
	"previous_status" text,
	"delivered" boolean DEFAULT false,
	"meal_count" integer NOT NULL,
	"default_portion_size" text NOT NULL,
	"subtotal" real NOT NULL,
	"discount" real NOT NULL,
	"total" real NOT NULL,
	"delivery_address" text,
	"delivery_notes" text,
	"delivery_slot" text DEFAULT 'morning',
	"payment_method" text,
	"payment_status" text DEFAULT 'pending',
	"payment_confirmation_image" text,
	"paymob_transaction_id" text,
	"delivery_date" text,
	"order_type" text DEFAULT 'trial',
	"subscription_billing_attempted_at" timestamp,
	"subscription_billing_status" text,
	"subscription_billing_error" text,
	"subscription_billing_retry_count" integer DEFAULT 0,
	"payment_method_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"paymob_card_token" text NOT NULL,
	"masked_pan" text,
	"card_brand" text,
	"expiry_month" text,
	"expiry_year" text,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_type" text NOT NULL,
	"config_key" text NOT NULL,
	"price" real NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_week_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"is_skipped" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"subscription_status" text DEFAULT 'active',
	"subscription_paused_at" timestamp,
	"subscription_cancelled_at" timestamp,
	"subscription_started_at" timestamp,
	"has_used_trial_box" boolean DEFAULT false,
	"user_type" text DEFAULT 'trial',
	"is_subscriber" boolean DEFAULT false,
	"paymob_subscription_id" integer,
	"paymob_plan_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"neighborhood" text NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "week_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_id" integer NOT NULL,
	"meal_id" integer NOT NULL,
	"is_available" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"label" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"order_deadline" timestamp NOT NULL,
	"delivery_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_selectable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "weeks_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;