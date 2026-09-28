# Kapeng Barako

Premium dark-theme artisan coffee storefront with Firebase-backed customer accounts, orders and inventory workflows.

## Architecture

- `index.html` — customer storefront
- `js/storefront.js` / `script.js` — storefront UI, cart and checkout
- `js/firebase-config.js` — Firebase Web App configuration placeholder
- `js/firebase-backend.js` — callable backend client
- `js/admin-auth.js` — shared Firebase Admin authentication guard
- `pages/admin/login.html` — single admin login entry
- `pages/admin/index.html` — admin console
- `functions/index.js` — server-side order creation and migration callables
- `firestore.rules` — customer/admin access rules
- `docs/FIREBASE_SETUP.md` — Firebase onboarding and deployment
- `docs/QA_CHECKLIST.md` — final browser QA checklist

## Authentication

Customer authentication uses Firebase Authentication. The Admin Console uses the **same Firebase Authentication project** and verifies authorization through:

`/admins/{uid}` → `{ active: true, role: "admin" }`

There is no hardcoded admin password and no localStorage-only admin security boundary.

## Orders + inventory

When the Firebase backend is configured, checkout is intended to submit through the `createOrder` Cloud Function. The function calculates totals from Firestore catalog/settings and reserves stock inside a Firestore transaction.

GCash is a **pending-verification workflow** in the current implementation; it is not a live payment gateway or automatic GCash verification.

Legacy browser data can be migrated with the protected migration callables after an authorized admin signs in. Browser localStorage is not a central database, so migration must be run from a browser that still contains the legacy records.

## Firebase onboarding

Follow [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) before testing live authentication or backend features.

Never commit a Firebase Admin SDK service-account JSON or private key. The website only needs the Firebase Web App config values in `js/firebase-config.js`.

## Deployment

GitHub Pages hosts the static storefront/admin UI. Firebase Cloud Functions and Firestore rules are deployed separately with the Firebase CLI.

## Browser QA

Use [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) for the final desktop/mobile smoke test. A production release is not considered complete until Firebase configuration, deployment and browser QA have all passed.
