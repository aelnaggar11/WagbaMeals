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

## Recent Changes

### October 12, 2025 - Pricing Display Accuracy Fix
- Fixed subtotal calculation to use base price (249 EGP per meal - smallest package price) before volume discounts
- Corrected first-order discount to apply 10% to order total after volume discount (not to subtotal)
- Updated checkout page order summary to accurately show: Subtotal (base price) → Volume Discount → First Order Discount (10%) → Final Total
- Ensured Paymob payment amount matches the checkout page total displayed to users

### October 12, 2025 - Payment Callback UX Improvement
- Updated payment response page to show toast notifications and auto-redirect users based on payment status
- Payment success flow: Shows "Payment Successful" toast and redirects authenticated users to dashboard (/account)
- Unauthenticated users redirected to login with returnTo parameter
- Payment failure flow: Shows "Payment Failed" toast and redirects authenticated users to checkout, unauthenticated users to home
- Unified payment callback route at /payment/response handles both success and failure scenarios with query parameters

### October 12, 2025 - Paymob Payment Gateway Integration  
- Integrated Paymob for credit card payment processing with full end-to-end flow
- Added Paymob payment service module with payment intention creation, HMAC webhook verification, and secure API authentication
- Created backend endpoints: /api/payments/paymob/create-intention for payment setup and /api/payments/paymob/webhook for payment confirmations
- Updated CheckoutPage to redirect to Paymob hosted checkout for credit card payments while maintaining InstaPay manual flow
- Enhanced order schema with paymob_transaction_id field for transaction tracking and payment status updates
- Implemented security measures: Zod validation prevents client-controlled amounts, HMAC verification secures webhooks, server-side order totals prevent manipulation
- Completed end-to-end testing: verified payment intention creation, webhook processing, HMAC signature validation, and order status updates

## Configuration Notes

### Paymob Setup
**Important:** Configure the following in your Paymob merchant dashboard:
- **Transaction Processed Callback (Webhook):** `https://your-domain.com/api/payments/paymob/webhook`
- **Transaction Response Callback (User Redirect):** `https://your-domain.com/payment/response`

The webhook endpoint receives server-to-server payment confirmations and updates order status. The response callback is where Paymob redirects customers after payment, with `?success=true/false` parameters.