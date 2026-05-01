# DynaLink Connect Mobile Apps

Expo-based mobile app scaffold for three separate DynaLink applications on Android and iOS:

| Variant | Application name | Android package | iOS bundle ID |
| --- | --- | --- | --- |
| `customer` | DynaLink Connect - Customer App | `com.dynalinkconnect.customer` | `com.dynalinkconnect.customer` |
| `driver` | DynaLink Connect Driver - Driver App | `com.dynalinkconnect.driver` | `com.dynalinkconnect.driver` |
| `vendor` | DynaLink Vendor - Vendor App | `com.dynalinkconnect.vendor` | `com.dynalinkconnect.vendor` |

## Current state

This app is scaffolded as one Expo project with separate build variants for:

1. `customer` mobile sign-in with a mobile bearer token
2. secure token persistence between app launches with session rehydration on boot
3. guest marketplace landing with site settings and vendor discovery before sign-in
4. live customer profile, wallet, orders, invoices entry point, and marketplace feed
5. `driver` mobile sign-in with live dashboard, offers, trips, proof of delivery, and fee totals
6. `vendor` mobile sign-in/sign-up with native dashboard, products, orders, payouts, notifications, and store settings

## Verified locally

The mobile app currently:

1. typechecks successfully with `tsc --noEmit`
2. reads from the mobile-safe API routes listed below
3. supports `customer` and `courier` native sessions
4. opens web fallbacks for pages that still live on the website, such as invoices, contact, about, and vendor dashboard

## Live mobile API routes

The Expo app now reads from dedicated mobile-safe routes:

- `/api/mobile/auth/login`
- `/api/mobile/auth/me`
- `/api/mobile/profile`
- `/api/mobile/orders`
- `/api/mobile/wallet`
- `/api/mobile/courier/dashboard`
- `/api/mobile/courier/signup`
- `/api/mobile/vendor/dashboard`
- `/api/mobile/vendor/signup`
- `/api/mobile/vendor/products`
- `/api/mobile/vendor/products/[id]`
- `/api/mobile/vendor/orders/[id]`
- `/api/mobile/vendor/payouts`

## Environment

Create `.env` in `apps/mobile` or export an environment variable:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
```

For Android emulator, you will usually want:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001
```

For a real Android phone running Expo Go on the same Wi-Fi, keep the web app running with the repo root `npm run dev` command so Next is exposed on your LAN. The mobile app will also try the Metro host automatically, for example `http://192.168.x.x:3001`.

## Run

From the repo root:

```bash
npm run mobile:start:customer
npm run mobile:start:driver
npm run mobile:start:vendor

npm run mobile:android:customer
npm run mobile:android:driver
npm run mobile:android:vendor

npm run mobile:ios:customer
npm run mobile:ios:driver
npm run mobile:ios:vendor
```

Or from `apps/mobile`:

```bash
npm run start:customer
npm run start:driver
npm run start:vendor

npm run android:customer
npm run android:driver
npm run android:vendor
```

## App variants

All three applications live in this same Expo project. There is no separate iOS or Android codebase to maintain right now.

- iPhone and Android both use `apps/mobile`
- Android local builds use Gradle flavors: `customer`, `driver`, and `vendor`
- EAS builds use `EXPO_PUBLIC_DYNALINK_APP_VARIANT` to select the app config
- customer, driver, and vendor are native role surfaces with separate auth and data paths

## EAS iOS builds

The project includes EAS profiles in `eas.json`.

For an internal iPhone build against the current LAN dev API:

```bash
npm run eas:ios:customer:credentials
npm run eas:ios:driver:credentials
npm run eas:ios:vendor:credentials
npm run eas:ios:device
npm run eas:ios:customer:preview
npm run eas:ios:driver:preview
npm run eas:ios:vendor:preview
```

The credentials command opens the Apple account flow that lets EAS create the distribution certificate and provisioning profile. It must run in an interactive terminal because Apple login and team/device choices cannot be completed in non-interactive shells.

The Expo account must have access to an Apple Developer Program team before EAS can create a real iPhone/TestFlight build. If `eas device:list` reports `No Apple teams found`, enroll or sign in with an Apple developer account first, then rerun the credentials command.

For an iOS Simulator archive that does not require Apple distribution credentials:

```bash
npm run eas:ios:simulator
```

For a production App Store/TestFlight build, set `EXPO_PUBLIC_API_BASE_URL` to the public `https://` API host first. Production EAS builds intentionally fail if the app is still pointed at localhost or a private LAN IP.

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-production-domain.example npm run eas:ios:production
```

On PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = 'https://your-production-domain.example'
npm run eas:ios:customer:production
npm run eas:ios:driver:production
npm run eas:ios:vendor:production
```

## Recommended next implementation order

1. add customer invoices
2. continue tightening driver proof-of-delivery and route tracking
3. split the large `src/app/mobile-app.tsx` surface into smaller customer, driver, vendor, and shared UI modules
