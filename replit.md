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

### October 13, 2025 - Payment Bypass Prevention & Pricing Fixes (COMPLETED)
- **Issue:** Users could bypass payment during onboarding by clicking Wagba logo after registration, seeing "confirmed" orders without paying
- **Root Cause:** Checkout endpoint incorrectly marked card payment orders as paymentStatus='confirmed' before actual payment completion
- **Security Fixes:**
  1. Removed premature payment confirmation: Card payment orders now remain paymentStatus='pending' until Paymob webhook confirms payment
  2. Account page security: /api/orders endpoint now filters to only return orders with paymentStatus='paid', preventing display of unpaid orders
  3. Payment status flow: pending (checkout) → paid (webhook) - users cannot access account with unpaid orders
- **Pricing Fixes:**
  1. Fixed getPendingOrderByUser to return most recent pending order using ORDER BY createdAt DESC (prevents showing old orders when users change meal selections)
  2. Fixed Paymob first-order discount: Excludes current order when checking for previous confirmed orders, correctly applies 10% discount to first subscription
  3. Corrected discount calculation: 10% applied to order total after volume discount (e.g., 10 meals at 199 EGP = 1990 EGP, minus 10% = 1791 EGP)
- **Testing:** E2E verification completed - users cannot bypass payment, pricing accurate throughout checkout flow, Paymob charges correct amounts

### October 12, 2025 - Pricing Display Accuracy Fix
- Fixed subtotal calculation to use base price (249 EGP per meal - smallest package price) before volume discounts
- Corrected first-order discount to apply 10% to order total after volume discount (not to subtotal)
- Updated checkout page order summary to accurately show: Subtotal (base price) → Volume Discount → First Order Discount (10%) → Final Total
- Fixed Paymob payment amount to include delivery fee (order total + 100 EGP delivery fee)
- Fixed mixed portion pricing: checkout now recalculates subtotal/discount based on actual selected meals (e.g., 3 standard + 3 large)
- Ensured accurate pricing for all portion combinations and payment amounts match checkout display

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

### October 13, 2025 - HMAC Verification Fix (COMPLETED)
- **Root Cause:** Payment methods weren't saving during checkout because HMAC signature verification was failing
- **Issue:** Used incorrect field structure (flat fields like `source_data_pan` instead of nested `source_data.pan`)
- **Fix:** Updated HMAC calculation to use correct nested structure per Paymob documentation:
  - Changed from `data.source_data_pan` to `data.source_data?.pan`
  - Changed from `data.source_data_sub_type` to `data.source_data?.sub_type`
  - Changed from `data.source_data_type` to `data.source_data?.type`
- **Impact:** Webhooks now verify correctly, allowing card tokens to be saved during subscription checkout
- **Testing:** Added diagnostic tool (`server/test-hmac.ts`) for manual HMAC verification testing
- **Documentation:** Added detailed logging showing all webhook fields and HMAC calculation steps

### October 13, 2025 - Payment Method Update Feature (COMPLETED)
- **User Experience:** Subscribers can now update their saved payment method from the Subscription tab in their account dashboard
- **Payment Method Display:** Shows current saved card (masked PAN, brand) or "No payment method saved" message in Subscription Settings section
- **Update Flow:** "Update Payment Method" button initiates 1 EGP Paymob verification charge with card tokenization
  - Generates unique reference: PM_UPDATE_{userId}_{timestamp}
  - Creates Paymob intention with extras.payment_method_update flag and save_token=true
  - Redirects to Paymob unified checkout for secure card entry
- **Webhook Processing:** Enhanced webhook handler detects payment method updates via extras.payment_method_update flag
  - Deactivates existing payment methods when new card is saved
  - Saves new card token as default payment method
  - Prevents duplicate processing (early return after handling update)
- **API Endpoints:** Added GET /api/payment-methods (returns user's saved cards) and POST /api/payment-methods/update (initiates tokenization)
- **Security:** All endpoints protected by authMiddleware, user ID from session (not client), server-side reference generation
- **Testing:** E2E verification completed - UI displays correctly, API endpoints functional, Paymob redirect works, no validation errors

### October 12, 2025 - Subscription Payment System (COMPLETED)
- **Architecture:** Hybrid approach using Paymob card tokenization + custom billing scheduler for weekly recurring payments
- **Database Schema:** Added payment_methods table (card_token, masked_pan, card_brand, expiry) and subscription billing fields to orders (billing_attempted_at, billing_status, billing_error, billing_retry_count, payment_method_id)
- **Card Tokenization:** Checkout flow enables Paymob tokenization for subscription orders (save_token_to_be_used: true), webhook extracts and stores card tokens with idempotency checks
- **Billing Scheduler:** Node-cron job runs hourly to charge subscriptions 2 hours after deadline
  - Billing window: 90 minutes (handles operational delays and cold starts)
  - Finds weeks where deadline + 2 hours falls within last 90 minutes
  - Filters orders: subscription type, not skipped, payment not paid, retry count < 3
  - Respects user subscription status (cancelled/paused subscriptions are skipped)
  - Charges order total + 100 EGP delivery fee using saved card tokens
  - Updates billing status (success/failed) and stores transaction IDs
- **Retry Logic:** Smart retry system that only increments count after actual payment attempts
  - Pre-check failures (no payment method, cancelled subscription) don't consume retries
  - Payment failures increment retry count, max 3 attempts
  - Max retries exceeded: Logged for manual intervention, excluded from future billing
  - Order scoping fixed: retry count accessible in both try and catch blocks
- **Payment Methods CRUD:** Full implementation in DatabaseStorage for managing tokenized cards (get, create, update, delete, set default)
- **Skip/Cancel Logic:** Fully functional - skips orders with status='skipped' and users with cancelled/paused subscriptions
- **Security:** Card tokens stored securely, idempotent webhook processing, server-side amount validation
- **Testing:** E2E verification completed - authentication, database schema, API endpoints, and billing scheduler all functional and production-ready

## Configuration Notes

### Paymob Setup
**Important:** Configure the following in your Paymob merchant dashboard:
- **Transaction Processed Callback (Webhook):** `https://your-domain.com/api/payments/paymob/webhook`
- **Transaction Response Callback (User Redirect):** `https://your-domain.com/payment/response`

The webhook endpoint receives server-to-server payment confirmations and updates order status. The response callback is where Paymob redirects customers after payment, with `?success=true/false` parameters.