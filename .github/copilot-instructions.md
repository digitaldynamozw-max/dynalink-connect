# DynaLink Connect - Copilot Instructions

This file provides workspace-specific custom instructions to Copilot for the DynaLink Connect project.

## Project Overview
DynaLink Connect is a modern e-commerce store built with Next.js, similar to WooCommerce. It includes product catalog, shopping cart, user authentication, payment integration with PayNow, and an admin dashboard.

## Project Setup Checklist
- [x] Verify that the copilot-instructions.md file in the .github directory is created
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete

## Key Project Information

### Technology Stack
- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma with SQLite
- NextAuth.js
- PayNow Payment Gateway
- Zustand

### Important Commands
- Development: `npm run dev` (runs on http://localhost:3001)
- Database setup: `npx prisma migrate dev --name init`
- Database generation: `npx prisma generate`
- Seed database: `curl -X POST http://localhost:3001/api/seed`

### Credentials
- Admin: admin@example.com / password

### Key Features
- Product catalog with search and filtering
- Shopping cart with Zustand state management
- User authentication with NextAuth.js
- PayNow payment integration
- Multi-vendor marketplace with storefronts
- Automatic delivery fee calculation
- User profiles with settings, promo codes, and referrals
- Support ticket system
- Vendor dashboard for product management
- Order history and tracking

### API Routes
All API endpoints are documented in README.md, including:
- Authentication endpoints
- Product management
- Order processing  
- Cart operations
- User profile management
- Ratings and reviews
- Support tickets
- Admin functions

### Development Guidelines
- Use relative imports with @ alias (@/lib, @/components, etc.)
- Keep components in /components directory
- Store utilities and helpers in /lib directory
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Document API endpoints in README.md
- Maintain WHMCS-style interface patterns for billing system UI