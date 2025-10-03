# Wagba - Weekly Meal Delivery Platform

## Overview

Wagba is a full-stack meal delivery application focused on weekly meal plans. The platform allows customers to select weekly meal plans, customize their meals, and manage recurring deliveries. It features separate customer and admin interfaces with comprehensive order management, menu planning, and user authentication systems.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth with express-session
- **Session Storage**: PostgreSQL-backed sessions (connect-pg-simple) for production

### Database Layer
- **ORM**: Drizzle ORM with type-safe queries
- **Database**: PostgreSQL (Neon serverless in production)
- **Migrations**: Drizzle Kit for schema management
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### User Management
- **Dual Authentication**: Separate user and admin authentication systems
- **User Roles**: Customer users and admin users with different permission levels
- **Session Management**: Secure session handling with HttpOnly cookies
- **Profile Management**: User profile updates and address management

### Meal Planning System
- **Weekly Menus**: Time-based meal selection with configurable weeks
- **Portion Sizes**: Standard and large portion options with dynamic pricing
- **Meal Customization**: Individual meal selection within weekly plans
- **Inventory Management**: Meal availability tracking

### Order Management
- **Order Lifecycle**: Draft → Pending → Confirmed → Delivered workflow
- **Skip Functionality**: Allow users to skip weeks without canceling
- **Order Modification**: Edit meals before order deadline
- **Delivery Editing**: Change meal count and portion size for specific weeks, with option to apply to all future deliveries
- **Pricing Engine**: Dynamic pricing based on meal count and portion size

### Admin Dashboard
- **Menu Management**: Create and manage weekly menus
- **Order Tracking**: View and manage all customer orders
- **User Management**: Customer account management
- **Analytics**: Order statistics and reporting

## Data Flow

### Customer Journey
1. **Plan Selection**: Choose meal count and portion preferences
2. **Menu Selection**: Select individual meals for the week
3. **Account Creation**: Register or login to complete order
4. **Order Confirmation**: Review and finalize weekly order
5. **Account Management**: Modify upcoming orders, skip weeks, update profile

### Admin Workflow
1. **Menu Planning**: Create weekly menus with available meals
2. **Order Processing**: Monitor incoming orders and deadlines
3. **Delivery Management**: Track order fulfillment status
4. **Customer Support**: Manage customer accounts and orders

### Session Management
- **Production**: PostgreSQL-backed sessions for persistence
- **Development**: Memory store for faster development
- **Security**: Secure cookies, CSRF protection, HttpOnly flags

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe database operations
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **bcryptjs**: Password hashing
- **@tanstack/react-query**: Server state management

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Tools
- **vite**: Fast build tool and dev server
- **typescript**: Type safety
- **drizzle-kit**: Database schema management
- **esbuild**: Production bundling

## Deployment Strategy

### Environment Configuration
- **NODE_ENV**: production/development environment
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Secure session encryption key (required)
- **PORT**: Server port (defaults to 5000)

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server to `dist/index.js`
3. **Static Assets**: Served from built frontend directory

### Production Requirements
- PostgreSQL database with connection pooling
- Secure session secret (32+ characters)
- HTTPS for secure cookie handling
- Environment variables configured in deployment platform

### Session Store Configuration
- **Development**: Memory store (sessions lost on restart)
- **Production**: PostgreSQL store (persistent sessions)
- **Fallback**: Automatic fallback to memory store if database unavailable

### Authentication Strategy
- Cookie-based sessions with secure flags in production
- Separate authentication contexts for users and admins
- Token-based fallback authentication for API requests
- Session persistence across application restarts

## Changelog
- October 3, 2025: PASSWORD RESET FIX - Fixed broken password reset email links in production that were generating invalid URLs (https:///reset-password)
- October 3, 2025: Updated password reset email service to use wagba.food domain directly in production instead of auto-detected workspace URLs
- October 3, 2025: CROSS-DEVICE AUTHENTICATION FIX - Resolved intermittent checkout authentication failures on mobile devices by updating cookie SameSite settings
- October 3, 2025: Updated production session cookies to use SameSite='none' with secure flag to support cross-site requests on mobile browsers
- October 3, 2025: Added optional COOKIE_DOMAIN environment variable for shared cookie domains across subdomains in production
- October 3, 2025: Enhanced authentication logging with detailed diagnostics (session vs token auth, failure reasons, cookie presence indicators)
- October 3, 2025: Verified token-based authentication fallback works correctly via Authorization header when session cookies are blocked
- October 1, 2025: WELCOME EMAIL SYSTEM - Implemented automatic welcome emails via Brevo template ID 1 for first-time customers after checkout
- October 1, 2025: Welcome emails include dynamic customer data: name, meal count, portion size, first delivery date, and order total
- October 1, 2025: Fixed Brevo email service initialization by changing from dynamic to static imports in routes.ts
- September 30, 2025: DEPLOYMENT FIXES - Fixed checkout showing EGP 0 subtotal by calculating pricing server-side when order is created during registration
- September 30, 2025: Fixed onboarding redirect issue where users briefly saw meal selection page before checkout by using window.location.replace() for immediate clean redirects
- September 30, 2025: Eliminated confusing "default subscription values" - removed defaultMealCount, defaultPortionSize, defaultDeliverySlot from user schema and UI
- July 17, 2025: CRITICAL PRICING FIX - Fixed "not_selected" orders showing EGP 0 instead of proper pricing based on meal count and portion size
- July 17, 2025: Updated all existing "not_selected" orders in database (140 orders) to display correct pricing for admin dashboard
- July 17, 2025: Created calculateOrderPricing() helper function to ensure consistent pricing calculations across all order creation endpoints
- July 17, 2025: Enhanced admin meal management - removed price field since pricing is subscription-based, added ingredients field for meal editing
- July 15, 2025: INSTAPAY PAYMENT VERIFICATION SYSTEM COMPLETED - Admin can now verify InstaPay payments via Orders Management > Upcoming Orders tab with "Mark Received" and "Mark Failed" buttons
- July 15, 2025: INSTAPAY EMAIL SYSTEM RESOLVED - Fixed SendGrid sender identity verification issue, InstaPay email notifications now working correctly (emails delivered to spam folder)
- July 15, 2025: Added InstaPay payment option for trial boxes with wagba.food account display and payment confirmation image upload
- July 15, 2025: Integrated SendGrid email notifications to admin (aelnaggar35@gmail.com) with payment confirmation attachments
- July 15, 2025: Added payment status tracking (pending/processing/confirmed/failed) with admin dashboard controls
- July 15, 2025: Enhanced admin order management with InstaPay payment verification and "Mark Payment Received" functionality
- July 15, 2025: Updated user account interface to show payment processing status for InstaPay orders
- July 8, 2025: ONBOARDING UX IMPROVEMENTS - Added back buttons to all onboarding steps for better navigation flow
- July 8, 2025: Disabled meal selection dropdowns for non-Mix & Match subscriptions to prevent user confusion
- July 8, 2025: Removed individual meal pricing display from meal cards as all meals of same type have same price
- July 8, 2025: Enhanced meal selection UI with proper subscription type awareness and disabled states
- July 1, 2025: ADMIN HIERARCHY SYSTEM - Implemented super admin and regular admin roles with comprehensive admin account management
- July 1, 2025: Added AdminsManager component with role-based access control for creating, editing, and deleting admin accounts
- July 1, 2025: Enhanced admin authentication middleware with super admin role verification and security features
- July 1, 2025: Updated admin dashboard with dedicated "Admins" tab accessible only to super admin users
- July 1, 2025: Implemented admin role badges, icons, and proper database schema validation for admin hierarchy
- July 1, 2025: DYNAMIC PRICING SYSTEM - Implemented comprehensive pricing management for admins with immediate application-wide updates
- July 1, 2025: Added large meal add-on pricing configuration (50 EGP) for portion size upgrades
- July 1, 2025: Created dynamic pricing service to replace all hardcoded meal bundle and delivery pricing
- July 1, 2025: Built admin pricing management interface with meal bundles, delivery, and meal add-ons sections
- July 1, 2025: Database-backed pricing configurations with 5-minute cache for optimal performance
- June 29, 2025: CRITICAL FIX - Resolved systemic cache invalidation issues across entire application using direct refetch() approach
- June 29, 2025: Applied consistent cache refresh pattern to all admin components (InvitationCodesManager, MealsManager, NeighborhoodsManager, WaitlistManager)
- June 29, 2025: Replaced complex forceRefreshQuery utility with simple refetch() calls for immediate UI updates
- June 29, 2025: Eliminated React Query cache manipulation that was preventing UI updates after mutations
- June 23, 2025: Fixed authentication flow to prevent logged-in users from accessing onboarding routes (/, /meal-plans, /menu, /auth)
- June 23, 2025: Fixed Save Selection button to properly update order status to "selected" in backend
- June 23, 2025: Fixed week filtering to exclude past delivery dates from account page display
- June 23, 2025: Corrected order status display in admin dashboard - orders with meals now properly show as "selected"
- June 16, 2025: Fixed and tested automatic week skipping during onboarding - all weeks before user's selected first delivery are properly auto-skipped
- June 16, 2025: Updated `/api/user/upcoming-meals` endpoint to respect skipped weeks for first-time users
- June 16, 2025: Simplified order status logic - removed intermediate "selecting" state, orders stay "not_selected" until explicitly saved
- June 16, 2025: Added explicit "Save Selection" button requiring user action to mark orders as "selected"
- June 16, 2025: Optimized admin order items fetching with batched requests to eliminate console errors
- June 16, 2025: Fixed admin dashboard authentication synchronization issue preventing immediate access after login
- June 16, 2025: Added proper loading states and cache management for admin authentication flow
- June 16, 2025: Restored meal selection persistence with fresh data fetching on week switches
- June 16, 2025: Implemented aggressive cache-busting solution to fix meal selection persistence when switching weeks
- June 16, 2025: Added direct API bypass with timestamp cache-busting to prevent stale data display
- June 16, 2025: Fixed timing issues where old selections briefly appeared before updating to correct ones
- June 15, 2025: Fixed critical meal counting data corruption issues ("7 of 5", "17 of 6" displays)
- June 15, 2025: Added backend validation to prevent meal count limit violations in order item creation
- June 15, 2025: Resolved React Hooks violations in AccountPage component for stable rendering
- June 15, 2025: Cleaned up duplicate orders and excessive order items in database
- June 15, 2025: Fixed portion size counters to work properly with meal data lookup
- June 13, 2025: Individual meal portion size controls implemented with conditional display based on subscription type
- June 13, 2025: Mix & Match subscriptions show interactive portion controls, Standard/Large show static text
- June 13, 2025: Enhanced delivery editing with 4-15 meal count dropdown and existing pricing tiers
- June 13, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.