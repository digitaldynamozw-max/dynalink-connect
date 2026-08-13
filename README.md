# DynaLink Connect

A multi-vendor e-commerce platform built with Next.js, Prisma, NextAuth, and Paynow.

## Features

### Core Features
- Product catalog with search and filtering
- Shopping cart with Zustand state management
- User authentication with NextAuth.js
- Payment integration with Paynow
- Admin dashboard with comprehensive management tools
- Multi-vendor marketplace with storefronts
- Address-based delivery fee calculation
- User profiles with settings, promo codes, and referrals

### Recent Enhancements (v2.0)
- **Product Image Upload**: Vendors can upload product images during creation/editing
- **Product Management Pages**: Dedicated vendor dashboard for product CRUD operations
- **Bulk Product Import**: Vendors can upload CSV files to create many products at once from the products dashboard
- **Address-Based Delivery**: Improved delivery system using full address instead of ZIP codes
- **Enhanced Hero Section**: Modern grid layout with sample images and prominent CTAs
- **Improved UI/UX**: Better form handling, image previews, and loading states
- **Multi-Channel OTP Signup**: Registration OTP delivery now supports email, SMS, and WhatsApp

### Vendor Features
- Vendor registration and storefront creation
- Product management with image hosting
- Order management and tracking
- Delivery zone configuration
- Payout tracking
- Sales analytics

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

3. Seed the database:
```bash
npm run db:seed
```

Optional (HTTP seed endpoint in local or explicitly enabled production):
```bash
curl -X POST http://localhost:3001/api/seed
```

4. Configure environment variables in `.env`:
- Copy from `.env.example` and fill values.
- For local development, you can also use `.env.local` from `.env.local.example`.

Required (minimum to boot app and auth):
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL

Required for PayNow checkout:
- PAYNOW_INTEGRATION_ID
- PAYNOW_INTEGRATION_KEY

Required for protected cron endpoints and background jobs:
- CRON_SECRET
- AUCTION_REMINDER_DISPATCH_KEY

Required for email delivery:
- EMAIL_FROM
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS

Commonly configured app/runtime values:
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SITE_URL
- SITE_URL
- GOOGLE_MAPS_API_KEY
- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- GOOGLE_MAPS_REGION_CODE
- NEXT_PUBLIC_STORE_TIME_ZONE

Optional integrations and feature controls:
- PAYNOW_CALLBACK_TOKEN
- PAYNOW_TEST_MODE
- PAYNOW_MERCHANT_EMAIL
- PAYNOW_RECONCILE_BATCH_SIZE
- PAYNOW_RECONCILE_MAX_AGE_HOURS
- WHATSAPP_API_URL
- WHATSAPP_API_TOKEN
- WHATSAPP_SENDER_ID
- SMS_AUTH_TYPE
- SMS_API_URL
- SMS_API_USERNAME
- SMS_API_TOKEN
- SMS_SENDER_ID
- SMS_REQUEST_FORMAT
- SMS_TO_FIELD
- SMS_MESSAGE_FIELD
- SMS_FROM_FIELD

Tip:
- `NODE_ENV`, `VERCEL_URL`, and `VERCEL_PROJECT_PRODUCTION_URL` are usually provided by runtime/platform and are not required in local env templates.

5. Run the development server:
```bash
npm run dev
```

6. Run production readiness checks before deploy:
```bash
npm run verify:production
npm run env:check:strict
npm run env:drift:check
```

7. (Recommended) Install local git hooks for staged secret scanning:
```bash
npm run hooks:install
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## cPanel Deployment

For cPanel and CloudLinux Passenger hosting, use the Passenger package. Do not upload local `node_modules` from Windows into your live Linux app root.

1. Build the Passenger deployment package:
```bash
npm run package:cpanel:passenger
```
2. Upload `dist/dynalink-connect-cpanel-passenger-ready.zip` to your Node.js app root in cPanel and extract it there.
3. In cPanel Setup Node.js App, use:
   - Startup file: `server.js`
   - Node.js version: `20+`
4. Confirm the app root does not already contain an old `node_modules` folder.
5. Create `.env` from `.env.example` with your production values.
6. Click `Run NPM Install` in cPanel so Linux installs dependencies and Prisma generates the correct client.
7. Run:
```bash
./cpanel-prisma.sh
```
   If that script says Prisma is not installed yet, go back and run `Run NPM Install` again from the extracted app root.
8. Restart the Node.js app.
9. Configure scheduled jobs (cron) in cPanel:
   - Add `CRON_SECRET` in `.env` (used by protected cron endpoints).
   - Add `AUCTION_REMINDER_DISPATCH_KEY` in `.env` (used by auction reminders endpoint).
   - Add a Cron Job (every 5 minutes) for courier dispatch so riders get offers after vendor prep countdown:
```bash
curl -sS "https://YOUR_DOMAIN/api/couriers/offers/dispatch?token=YOUR_CRON_SECRET" >/dev/null 2>&1
```
   - Add a Cron Job (every 10 minutes) for PayNow reconciliation sweep:
```bash
curl -sS "https://YOUR_DOMAIN/api/payments/paynow/sweep?token=YOUR_CRON_SECRET" >/dev/null 2>&1
```
   - Add a Cron Job (every 5 minutes) for auction reminder dispatch:
```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/auctions/reminders/dispatch" -H "x-dispatch-key: YOUR_AUCTION_REMINDER_DISPATCH_KEY" >/dev/null 2>&1
```
   - Add a Cron Job (every 30 minutes) for saved-cart recovery nudges:
```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/ops/carts/recovery" -H "x-cron-secret: YOUR_CRON_SECRET" >/dev/null 2>&1
```
   - Add a Cron Job (every 5 minutes) for support SLA escalation:
```bash
curl -sS -X POST "https://YOUR_DOMAIN/api/ops/support/sla-escalate" -H "x-cron-secret: YOUR_CRON_SECRET" >/dev/null 2>&1
```

Notes:
- The Passenger package is the correct package for this project on cPanel.
- `dist/dynalink-connect-cpanel.zip` is more likely to break on Passenger-based shared hosting if mixed with prebuilt local modules.
- Use `./cpanel-prisma.sh` or `./node_modules/.bin/prisma` instead of `./node_modules/prisma/build/index.js` or plain `npx prisma` so cPanel uses the installed local CLI.
- The cPanel MySQL deploy flow uses schema sync for production instead of the SQLite migration history from local development.
- Courier offer dispatch is pull-based via cron and should run every 5 minutes in cPanel deployments.
- Auction reminder dispatch is pull-based via cron and only sends reminders for auctions ending within `AUCTION_REMINDER_LOOKAHEAD_MINUTES` (default `45`).
- If production secrets were exposed while troubleshooting, rotate `DATABASE_URL` credentials and `NEXTAUTH_SECRET`.
- For operations, incident handling, and secret-rotation workflow, see `docs/ops.md`.
- For generated environment variable matrix docs, see `docs/env.md` (regenerate with `npm run env:docs`).
- Readiness endpoint: `GET /api/ready` (full dependency/config checks). Liveness endpoint: `GET /api/health`.
- Optional provider probes: `GET /api/ready?probe=providers` (PayNow endpoint reachability + SMTP TCP reachability).
- Synthetic cron check: `POST /api/ops/synthetic/run` with `x-cron-secret`.
- Reliability dashboard: `/admin/reliability`.
- Diagnostic bundle: `GET /api/admin/ops/diagnostic-bundle` (admin).
- Staging parity checker: `npm run env:parity:check -- --staging path/to/staging.env --production path/to/production.env`.
- Incident timeline: `/admin/incidents`.
- Auto-remediation trigger: `POST /api/admin/ops/auto-remediate/run` with `x-cron-secret`.
- Print all cron commands from current env: `npm run ops:cron:print`.
- Verify cron endpoints in one dry-run: `npm run ops:cron:verify`.
- Export weekly reliability report: `npm run ops:reliability:weekly-report`.

## Admin Dashboard

Access the admin dashboard at `/admin/dashboard` (admin-only). Features include:

### Dashboard
- Overview statistics (total clients, orders, revenue)
- Quick action shortcuts
- Real-time metrics

### Client Management (`/admin/clients`)
- View all clients with details
- Edit client information
- Reset client passwords
- Block/unblock clients
- Add account credit to clients
- Delete clients
- Export clients list as CSV

### Sales Reports (`/admin/sales`)
- Daily sales data and trends
- Revenue analytics by period (7, 30, 90, 365 days)
- Top-selling products
- Export reports as CSV
- Average order value tracking

### Product Management (`/admin/products`)
- Create, read, update, delete products
- Manage inventory
- Update pricing and descriptions

**Admin Access:**
- Email: admin@example.com
- Password: password

## Usage

- Browse products at `/products`
- Sign up/sign in at `/auth/signup` or `/auth/signin`
- Choose email, SMS, or WhatsApp when requesting a signup OTP
- Add items to cart and checkout with Paynow
- Confirm provider-style payments at `/payments/confirm`
- View order history at `/orders`
- Success page at `/success` shows order confirmation and delivery ETA
- Access admin dashboard at `/admin/dashboard` (admin users only)
- View and manage profile at `/profile`
- Vendors can add products one by one or bulk import them from `/vendor/products`

Admin credentials: admin@example.com / password

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration with OTP request, resend, and verification actions
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints (signin, signout, session, etc.)

### Vendor Products
- `GET /api/vendor/products` - Get current vendor products
- `POST /api/vendor/products` - Create a vendor product
- `POST /api/vendor/products/bulk` - Bulk import vendor products from CSV-parsed payloads
- `POST /api/vendor/products/image` - Upload a vendor product image

### Products
- `GET /api/products` - Get all products
- `GET /api/products/[id]` - Get single product
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/[id]` - Update product (admin only)
- `DELETE /api/products/[id]` - Delete product (admin only)

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/[id]` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/[id]` - Update order status (admin only)

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart` - Update cart

### Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile/update` - Update profile information
- `POST /api/profile/picture` - Upload profile picture
- `POST /api/profile/password` - Change password
- `GET /api/profile/promo-codes` - Get user's promo codes
- `GET /api/profile/referrals` - Get referral information
- `POST /api/profile/referrals` - Create new referral
- `GET /api/profile/support` - Get support tickets
- `POST /api/profile/support` - Create support ticket

### Ratings & Reviews
- `POST /api/ratings/save` - Save product rating/review

### Checkout
- `POST /api/checkout` - Process checkout session
- `POST /api/payments/confirm` - Confirm payment by order ID and PayNow reference
- `GET|POST /api/payments/paynow/callback` - Provider callback endpoint for automatic payment confirmation
- `POST /api/payments/paynow/reconcile` - Poll PayNow using the saved poll URL and reconcile order payment status
- `GET|POST /api/payments/paynow/sweep` - Reconcile a batch of recent pending PayNow orders
- `GET|POST /api/admin/payments/monitor` - Admin payment monitor and manual sweep endpoint

## OTP Delivery Setup

Signup OTP supports three channels:
- Email
- SMS
- WhatsApp

Email delivery uses SMTP. SMS delivery supports flexible provider configuration through env vars, and WhatsApp delivery uses the configured WhatsApp API values.

Example SMS configuration for a generic bearer-token JSON API:

```env
SMS_AUTH_TYPE="bearer"
SMS_API_URL="https://your-sms-provider/send"
SMS_API_TOKEN="your-token"
SMS_SENDER_ID="DynaLink"
SMS_REQUEST_FORMAT="json"
SMS_TO_FIELD="to"
SMS_MESSAGE_FIELD="message"
SMS_FROM_FIELD="from"
```

For providers that require form posts instead of JSON, change:

```env
SMS_REQUEST_FORMAT="form"
```

For providers that require basic auth, set:

```env
SMS_AUTH_TYPE="basic"
SMS_API_USERNAME="your-username"
SMS_API_TOKEN="your-password-or-api-key"
```

If SMS or WhatsApp is not configured but SMTP is available, the OTP flow falls back to email. In local non-production development, unconfigured providers log OTP previews to the server console.

## Bulk Product Import

Vendors can bulk import products from the vendor products page using a CSV file.

Supported CSV columns:
- `name`
- `description`
- `price`
- `salePrice`
- `stock`
- `category`

Example:

```csv
name,description,price,salePrice,stock,category
Laptop,High-performance laptop,999.99,,10,Electronics
Wireless Mouse,Comfortable wireless mouse,29.99,24.99,50,Electronics
USB-C Cable,Fast charging cable,14.99,,100,Electronics
```

### Admin
- `POST /api/seed` - Seed database with sample data (development only)
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/clients` - List all clients
- `POST /api/admin/clients` - Create new client
- `GET /api/admin/clients/[id]` - Get client details
- `PUT /api/admin/clients/[id]` - Update client info
- `DELETE /api/admin/clients/[id]` - Delete client
- `POST /api/admin/clients/[id]/reset-password` - Reset client password
- `POST /api/admin/clients/[id]/credit` - Add account credit
- `GET /api/admin/sales` - Get sales report
- `GET /api/admin/sales/export` - Export sales report as CSV

### Vendor Settlement System (v3.0)
- `GET /api/vendor/analytics/sales` - Get vendor sales statistics (online orders only)
- `GET /api/vendor/revenue/records` - Get vendor payout records (online payments)
- `POST /api/vendor/settlements` - Request settlement from pending balance
- `GET /api/vendor/settlements` - Get vendor settlement requests
- `GET /api/admin/settlements` - List all settlement requests (admin only)
- `PATCH /api/admin/settlements/[id]` - Approve/reject/settle request (admin only)

**Key Feature**: Cash orders are excluded from vendor account credits. Only online payment orders (PayNow, Ecocash, OneMoney, Wallet) create vendor payout records that can be settled.

For complete system documentation, see [VENDOR_SETTLEMENT_SYSTEM.md](./VENDOR_SETTLEMENT_SYSTEM.md) and [SETTLEMENT_INTEGRATION_GUIDE.md](./SETTLEMENT_INTEGRATION_GUIDE.md).

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma with SQLite for local development and MySQL for production deployment
- NextAuth.js
- Paynow
- Zustand

## Admin Vendor Management

- Admin vendor management UI: [/admin/vendors]( /admin/vendors) — list, create, approve, and manage vendors.
- Admin vendor detail: [/admin/vendors/[id]]( /admin/vendors/[id]) — view vendor overview, balances, payouts, and activity.
- Admin vendor edit: [/admin/vendors/[id]/edit]( /admin/vendors/[id]/edit) — edit vendor profile, assets, and commission rate.
- Admin impersonation: admins can "Login as vendor" from the vendor list; this sets an impersonation cookie and lets admins view the vendor workspace as the vendor for troubleshooting. The relevant API routes are:
   - `POST /api/admin/impersonate` — start impersonation (admin only)
   - `DELETE /api/admin/impersonate` — end impersonation (admin only)
   - `GET /api/admin/impersonate-status` — check current impersonation state

Files of interest:
- `app/admin/vendors/page.tsx` — admin vendor list and actions
- `app/admin/vendors/[id]/page.tsx` — admin vendor detail view
- `app/admin/vendors/[id]/edit/page.tsx` — vendor edit form (admin)
- `app/vendor/dashboard/page.tsx` — vendor workspace; shows `ImpersonationBanner` when impersonating
- `lib/vendor-actor.ts` — server helper that resolves acting vendor id (handles impersonation cookies)

This section documents the built-in admin vendor flows and the impersonation feature for troubleshooting vendor accounts.
