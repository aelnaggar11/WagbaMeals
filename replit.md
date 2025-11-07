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

## Paymob Integration Details

**Webhook HMAC Verification:**
- **TRANSACTION webhooks:** 20 fields in specific order (amount_cents, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded, is_standalone_payment, is_voided, order.id, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success)
- **TOKEN webhooks:** 8 fields in ALPHABETICAL order (card_subtype, created_at, email, id, masked_pan, merchant_id, order_id, token) - discovered through testing with actual webhook data
- **SUBSCRIPTION webhooks:** Format "{trigger_type}for{subscription_id}" (e.g., "suspendedfor1264")

**Subscription Flow (Asynchronous via Webhooks):**
1. Create payment intention with `save_token=true` for subscription orders
2. Payment webhooks arrive (order may vary - TOKEN often arrives BEFORE TRANSACTION)
3. TRANSACTION webhook: Payment confirmed, HMAC verified
4. TOKEN webhook: Card token received, HMAC verified using alphabetical field order
5. Create payment method from token and store plan ID on user record
6. SUBSCRIPTION webhook: Paymob sends webhook with subscription ID after creating subscription
7. Find user by email from `client_info.email` in webhook payload
8. Link subscription ID to user record (first time) or update subscription status (subsequent webhooks)

**Key Implementation Details:**
- **Payment intention API does NOT return subscription ID** - it returns `object: "paymentintention"` with status "intended"
- **Subscription creation is ASYNCHRONOUS** - Paymob creates subscriptions after payment success and delivers subscription ID via webhook
- **SUBSCRIPTION webhook contains:** `subscription_data.id` (integer), `client_info.email`, `plan_id`, `state`, `trigger_type`
- **Database fields:** `paymobSubscriptionId` (integer), `paymobPlanId` (integer)
- **User lookup strategy:** Find by subscription ID (existing subscriptions) OR by email (new subscriptions from client_info)

**Webhook Ordering Solution:**
- TOKEN webhooks may arrive before TRANSACTION webhooks (race condition)
- Solution: Use email-based order lookup instead of Paymob order ID
- Process: Find user by email → Find their most recent pending subscription order → Link card token
- Database field: `paymobOrderId` tracks Paymob's internal order ID for cross-referencing
- This approach works regardless of webhook arrival order

**Security:**
- All webhooks require strict HMAC verification
- TOKEN webhooks are rejected if HMAC verification fails to prevent card token injection attacks
- Card tokens are stored securely and used only for authorized subscription creation

## External Dependencies
-   **Database:** `@neondatabase/serverless` (PostgreSQL driver), `drizzle-orm`, `drizzle-kit`.
-   **Authentication/Security:** `express-session`, `connect-pg-simple`, `bcryptjs`.
-   **Frontend Libraries:** `@tanstack/react-query`, `@radix-ui/react-*`, `tailwindcss`, `lucide-react`, `class-variance-authority`.
-   **Build/Dev Tools:** `vite`, `typescript`, `esbuild`.
-   **Payment Gateway:** Paymob.
-   **Email Service:** Brevo (transactional emails).
-   **Email Service (backup):** SendGrid (for InstaPay notifications).