# Wagba - Weekly Meal Delivery Platform

## Overview
Wagba is a full-stack platform for weekly meal plan delivery. It allows customers to select and customize meal plans, manage recurring deliveries, and interact through customer and admin interfaces. The platform aims to streamline order management, offer flexible meal planning, and provide secure user authentication for a seamless experience in the meal delivery market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Wagba uses a modern full-stack architecture with distinct frontend and backend components.

**Frontend:**
-   **Framework:** React 18 with TypeScript.
-   **Routing:** Wouter.
-   **State Management:** TanStack React Query.
-   **UI:** Radix UI and shadcn/ui for components, styled with Tailwind CSS.
-   **Build:** Vite.

**Backend:**
-   **Runtime:** Node.js with Express.js.
-   **Language:** TypeScript (ES modules).
-   **Database:** PostgreSQL with Drizzle ORM.
-   **Authentication:** Session-based using `express-session`, with PostgreSQL-backed sessions.

**Key Features:**
-   **User Management:** Customer and admin authentication, role-based access, secure sessions.
-   **Meal Planning:** Configurable weekly menus, dynamic portion sizing, individual meal customization.
-   **Order Management:** Full order lifecycle (Draft to Delivered), skip week functionality, pre-deadline modifications, dynamic pricing.
-   **Payment Gateway:** Integrated Paymob for credit card processing with secure payment intentions and webhook verification. Supports Paymob (credit cards) and InstaPay (manual confirmation). Paymob's native subscription APIs are used for recurring payments.
-   **Admin Dashboard:** Tools for menu creation, order tracking, customer management, and analytics.
-   **UI/UX:** Consistent design system with Tailwind CSS and accessible components via Radix UI.

## External Dependencies
-   **Database:** `@neondatabase/serverless` (PostgreSQL driver), `drizzle-orm`, `drizzle-kit`.
-   **Authentication/Security:** `express-session`, `connect-pg-simple`, `bcryptjs`.
-   **Frontend Libraries:** `@tanstack/react-query`, `@radix-ui/react-*`, `tailwindcss`, `lucide-react`, `class-variance-authority`.
-   **Build/Dev Tools:** `vite`, `typescript`, `esbuild`.
-   **Payment Gateway:** Paymob.
-   **Email Service:** Brevo (transactional emails).
-   **Email Service (backup):** SendGrid (for InstaPay notifications).