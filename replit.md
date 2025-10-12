# Wagba - Weekly Meal Delivery Platform

## Overview
Wagba is a comprehensive full-stack meal delivery platform designed for weekly meal plans. It enables customers to select and customize meal plans, manage recurring deliveries, and interact with an intuitive interface. The platform includes distinct customer and admin interfaces, offering robust features for order management, menu planning, user authentication, and delivery editing, with a focus on streamlining the meal subscription experience. The project aims to capture the growing market for convenient, customizable meal solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI with shadcn/ui for accessible and customizable components.
- **Styling**: Tailwind CSS for a utility-first approach and a custom design system.
- **Routing**: Wouter for lightweight client-side navigation.

### Technical Implementations
- **Backend**: Node.js with Express.js and TypeScript for a robust API.
- **Database**: PostgreSQL managed with Drizzle ORM for type-safe queries and schema management (Drizzle Kit). Neon serverless PostgreSQL is used in production.
- **Authentication**: Session-based authentication using `express-session` and `connect-pg-simple` for PostgreSQL-backed sessions in production.
- **State Management**: TanStack React Query for efficient server state management on the frontend.
- **Build Tools**: Vite for frontend development and esbuild for backend bundling.

### Feature Specifications
- **User Management**: Dual authentication for customers and admins, role-based access, secure session handling, and profile management.
- **Meal Planning**: Weekly menus with time-based selection, configurable weeks, dynamic pricing based on portion sizes (standard/large), and individual meal customization.
- **Order Management**: Comprehensive order lifecycle (Draft → Pending → Confirmed → Delivered), ability to skip weeks, modify meals before deadlines, and edit delivery details (meal count, portion size). Dynamic pricing engine integrated.
- **Admin Dashboard**: Tools for menu creation, customer order tracking, user management, and basic analytics.

### System Design Choices
- **Session Management**: Secure, HttpOnly cookie-based sessions, with PostgreSQL persistence in production and in-memory storage for development.
- **Deployment**: Utilizes environment variables for configuration (e.g., `DATABASE_URL`, `SESSION_SECRET`). Frontend built to `dist/public` and backend bundled to `dist/index.js`.
- **Pricing System**: Dynamic pricing managed via an admin interface, applying immediately across the application with a 5-minute cache for performance.

## External Dependencies

- **Database & ORM**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Backend Core**: `express-session`, `connect-pg-simple`, `bcryptjs`
- **Frontend State Management**: `@tanstack/react-query`
- **UI Libraries**: `@radix-ui/react-*`, `tailwindcss`, `lucide-react`, `class-variance-authority`
- **Development & Build**: `vite`, `typescript`, `esbuild`