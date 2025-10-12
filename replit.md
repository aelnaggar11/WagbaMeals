# Wagba - Weekly Meal Delivery Platform

## Overview
Wagba is a comprehensive full-stack platform designed for weekly meal plan delivery. It enables customers to select and customize meal plans, manage recurring deliveries, and interact through dedicated customer and admin interfaces. The platform focuses on streamlined order management, flexible meal planning, and secure user authentication, aiming to provide a seamless experience for both users and administrators in the meal delivery market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Wagba utilizes a modern full-stack architecture with separate frontend and backend components.

**Frontend:**
-   **Framework:** React 18 with TypeScript.
-   **Routing:** Wouter.
-   **State Management:** TanStack React Query.
-   **UI:** Radix UI and shadcn/ui for components, styled with Tailwind CSS.
-   **Build:** Vite.

**Backend:**
-   **Runtime:** Node.js with Express.js.
-   **Language:** TypeScript (ES modules).
-   **Database:** PostgreSQL with Drizzle ORM for type-safe queries and schema management (Drizzle Kit).
-   **Authentication:** Session-based using `express-session`, with PostgreSQL-backed sessions for persistence in production.

**Key Features:**
-   **User Management:** Dual authentication for customers and admins, role-based access, and secure session handling.
-   **Meal Planning:** Configurable weekly menus, dynamic portion sizing (standard/large), and individual meal customization.
-   **Order Management:** Comprehensive lifecycle (Draft → Pending → Confirmed → Delivered), skip week functionality, and pre-deadline order modification. Dynamic pricing is based on meal count and portion size.
-   **Payment Gateway:** Integrated Paymob for credit card processing with secure payment intentions, HMAC webhook verification, and transaction tracking. Supports both Paymob (credit cards) and InstaPay (manual confirmation) payment methods.
-   **Admin Dashboard:** Tools for menu creation, order tracking, customer management, and analytics.
-   **UI/UX:** Employs a consistent design system built with Tailwind CSS, ensuring accessibility through Radix UI primitives.

## External Dependencies
-   **Database:** `@neondatabase/serverless` (PostgreSQL driver), `drizzle-orm`, `drizzle-kit`.
-   **Authentication/Security:** `express-session`, `connect-pg-simple`, `bcryptjs`.
-   **Frontend Libraries:** `@tanstack/react-query`, `@radix-ui/react-*`, `tailwindcss`, `lucide-react`, `class-variance-authority`.
-   **Build/Dev Tools:** `vite`, `typescript`, `esbuild`.
-   **Payment Gateway:** Paymob (for credit card processing).
-   **Email Service:** Brevo (for transactional emails like welcome and password reset).
-   **Email Service (legacy/backup):** SendGrid (for InstaPay notifications).