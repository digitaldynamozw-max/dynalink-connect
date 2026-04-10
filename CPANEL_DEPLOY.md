# cPanel Deployment

This package is prepared for cPanel Node.js app deployment.

## Expected cPanel setup

- Node.js app enabled in cPanel
- A persistent database configured
- Environment variables added in cPanel

## Upload

1. Upload and extract this package into your app directory.
2. In cPanel Node.js App, point the application root to that extracted folder.
3. Set the startup file to `app.js`.

## Install and build

Run these commands in the app directory:

```bash
npm install
npm run build:cpanel
npx prisma db push --schema prisma/schema.mysql.prisma
```

## Start command

cPanel should start the app with:

```bash
node app.js
```

## Required environment variables

At minimum, configure:

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_REGION_CODE=
DELIVERY_FEE_PER_KM=
DELIVERY_MIN_FEE=
PLATFORM_STORE_ADDRESS=
PAYNOW_INTEGRATION_ID=
PAYNOW_INTEGRATION_KEY=
ALLOW_SEED_ENDPOINT=false
SEED_SECRET=
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

## Database note

Do not use the local SQLite dev database on cPanel for production use. Point `DATABASE_URL` to a persistent hosted database first.

## Optional seed route

If you want production seeding enabled, set:

```bash
ALLOW_SEED_ENDPOINT=true
SEED_SECRET=<long-random-secret>
```

Then call:

```bash
POST /api/seed
Header: x-seed-secret: <your-secret>
```

## Startup note

The production build uses:

- `npm run build:cpanel` for cPanel MySQL deployments using Next.js compile mode
- `app.js` as the Passenger startup file
- `server.js` for serving the built app
