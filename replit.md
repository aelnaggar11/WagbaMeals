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
- June 13, 2025: Individual meal portion size controls implemented with conditional display based on subscription type
- June 13, 2025: Mix & Match subscriptions show interactive portion controls, Standard/Large show static text
- June 13, 2025: Enhanced delivery editing with 4-15 meal count dropdown and existing pricing tiers
- June 13, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.