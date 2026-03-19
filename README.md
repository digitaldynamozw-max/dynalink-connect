# DynaLink Connect

A modern e-commerce store built with Next.js, similar to WooCommerce.

## Features

- Product catalog
- Shopping cart
- User authentication
- Payment integration with Stripe
- Admin dashboard

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
curl -X POST http://localhost:3001/api/seed
```

4. Configure environment variables in `.env`:
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- STRIPE_SECRET_KEY (get from Stripe dashboard)
- STRIPE_PUBLISHABLE_KEY (get from Stripe dashboard)

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

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
- Add items to cart and checkout (Stripe test mode supported)
- View order history at `/orders`
- Success page at `/success` shows order confirmation and delivery ETA
- Access admin dashboard at `/admin/dashboard` (admin users only)
- View and manage profile at `/profile`

Admin credentials: admin@example.com / password

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints (signin, signout, session, etc.)

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

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma with SQLite
- NextAuth.js
- Stripe
- Zustand
