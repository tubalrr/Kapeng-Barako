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

Customer authentication uses Firebase Authentication. The Admin Console uses the **same Firebase Authentication project** and checks the signed-in user's authorization through:

`/admins/{uid}` → `{ active: true, role: "admin" }`

### ⚠️ Admin security limitation

**This template uses client-side authentication for demo/template purposes. It is not suitable as a secure production admin authentication system without a backend.**

GitHub Pages is a static hosting platform, so the Admin Console UI and its client-side authentication guard cannot by themselves provide a server-side security boundary. Firebase Authentication and Firestore Security Rules should still be configured for the buyer's own Firebase project, and any production admin operations that require stronger protection should be enforced by trusted backend code (for example, Cloud Functions or another server-side API).

The included demo admin account is for template/demo use only and must not be treated as a production credential.

## Orders + inventory

When the Firebase backend is configured, checkout is intended to submit through the `createOrder` Cloud Function. The function calculates totals from Firestore catalog/settings and reserves stock inside a Firestore transaction.

GCash reference collection is for order recording. Actual payment verification requires a real payment gateway or manual admin verification.

The Admin Console may record a GCash reference and a payment-review status, but the presence of a reference number does **not** prove that payment was completed or verified.

Legacy browser data can be migrated with the protected migration callables after an authorized admin signs in. Browser localStorage is not a central database, so migration must be run from a browser that still contains the legacy records.

## Firebase onboarding — buyer must use their own project

**Important for buyers:** this template intentionally ships with Firebase placeholders. You must create and use **your own Firebase project** before enabling live authentication, orders, inventory, checkout, or Admin features. Do not reuse the seller's Firebase project, admin UID, email, or credentials.

Step-by-step setup is in [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).

`js/firebase-config.js` must be filled with the Web App configuration from your own Firebase project. Never commit a Firebase Admin SDK service-account JSON, private key, or backend credential.

## Deployment

GitHub Pages hosts the static storefront/admin UI. Firebase Cloud Functions and Firestore rules are deployed separately with the Firebase CLI.

## Browser QA

Use [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) for the final desktop/mobile smoke test. A production release is not considered complete until Firebase configuration, deployment and browser QA have all passed.
