# cPanel Passenger Deployment

This package is prepared for cPanel hosts that run Node.js apps through Passenger.

## Use this package when

- your cPanel has a `Setup Node.js App` section
- the panel asks for an application startup file
- the host uses Passenger to launch Node apps

## Application settings

Use these values in cPanel:

- Application root: the folder where you extract this package
- Application URL: your chosen domain or subdomain
- Application startup file: `app.js`
- Node.js version: use the newest version your host offers that is compatible with Next.js 16

## After upload

1. Upload and extract the zip into the application root.
2. Open `Setup Node.js App` in cPanel.
3. Point the app to that folder.
4. Set the startup file to `app.js`.
5. Open a terminal in cPanel or SSH into the account.
6. Run:

```bash
npm install
npm run build
```

7. Restart the Node.js app from cPanel.

## Environment variables

Set these in cPanel before the restart:

```bash
NODE_ENV=production
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

## Important note about data

This project should not use the local SQLite dev database in cPanel production. Use a persistent hosted database and set `DATABASE_URL` to that production connection string.

## Optional production seeding

If you want the deployed app to accept a protected seed request:

```bash
ALLOW_SEED_ENDPOINT=true
SEED_SECRET=<long-random-secret>
```

Then send:

```bash
POST /api/seed
Header: x-seed-secret: <your-secret>
```

## Runtime flow

- `app.js` is the Passenger startup file
- `app.js` loads `server.js`
- `server.js` serves the built Next.js production app
