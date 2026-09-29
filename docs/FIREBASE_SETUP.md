# Firebase Setup — Buyer Installation Guide

This template uses **Firebase Authentication + Firestore + Cloud Functions** while the public UI is hosted on GitHub Pages.

> ## IMPORTANT — BUYER MUST CREATE THEIR OWN FIREBASE PROJECT
>
> This repository is intentionally shipped with **Firebase placeholders only**.
> It is not connected to the seller's Firebase project.
>
> Before using live customer accounts, checkout, orders, inventory sync, or Admin features, the buyer must:
>
> 1. Create their **own Firebase project**.
> 2. Create a **Web App** inside that project.
> 3. Put that project's Web App config into `js/firebase-config.js`.
> 4. Create their **own admin email/account**.
> 5. Replace the admin email placeholder in `functions/index.js` and `firestore.rules`.
> 6. Deploy Firestore rules and Cloud Functions to **their own Firebase project**.
>
> Do not reuse another seller's Firebase project, credentials, admin UID, or service-account key.

## 1. Create your Firebase project

In the Firebase Console:

1. Create a new project for your business.
2. Add a **Web App**.
3. Copy the Web App config values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
4. Open `js/firebase-config.js`.
5. Replace the `REPLACE_WITH_...` values with the values from **your** Firebase Web App.

The file is deliberately committed with placeholders so the template does not expose a seller-owned Firebase project.

## 2. Configure Authentication

In Firebase Console → **Authentication → Sign-in method**:

Enable the providers you want to use. For this template, enable at least:

- **Email/Password**
- **Google** if you want to use the one-time Google admin password setup

Also add your GitHub Pages hostname under **Authorized domains**.

For a GitHub Pages deployment such as `https://YOUR-USERNAME.github.io`, authorize the matching hostname used by your buyer-owned deployment.

## 3. Configure your admin email

Choose the email address the buyer will use as the store admin.

In `functions/index.js`, find:

```js
const AUTHORIZED_ADMIN_EMAIL = "REPLACE_WITH_ADMIN_EMAIL";
```

Replace it with the buyer's real Firebase admin email.

In `firestore.rules`, replace:

```text
REPLACE_WITH_ADMIN_EMAIL
```

with the **same** admin email.

Do not use a seller's email here.

## 4. Create the Firebase admin user

Create the admin user in Firebase Authentication using the buyer's own email.

Copy that user's Firebase **UID**.

Create this Firestore document:

`admins/{UID}`

with:

```text
active: true
role: "admin"
email: "THE_SAME_ADMIN_EMAIL"
```

The app uses the Firebase Auth identity plus the active `admins/{uid}` document for Admin authorization.

## 5. Install and deploy Firebase

From the repository root:

```bash
firebase login
firebase use <YOUR_FIREBASE_PROJECT_ID>
firebase deploy --only firestore:rules,functions
```

If the local Firebase CLI project has not been initialized yet:

```bash
firebase init firestore functions
```

When prompted, select the **buyer's Firebase project**.

Do not replace the repository's `firebase.json`, `firestore.rules` or `functions/` architecture unless you understand the resulting changes.

## 6. Verify the client configuration

After editing `js/firebase-config.js`, verify the following are no longer placeholders:

```text
apiKey
authDomain
projectId
storageBucket
messagingSenderId
appId
```

The application intentionally detects placeholder values and treats Firebase onboarding as incomplete until the buyer supplies a real project configuration.

## 7. Verify Admin Login

Open:

`/pages/admin/login.html`

Use the buyer's Firebase admin email/password.

For first-time password setup, the Google account must be the same authorized admin identity configured in Step 3.

A normal customer account must not be added to `admins/{uid}`.

## 8. Firestore collections used by the website

The live backend can use these collections/documents:

```text
products/{productId}
orders/{orderId}
promos/{promoId}
settings/store
content/gallery
admins/{uid}
users/{uid}/...
```

The website's existing rules keep public catalog/content reads separate from protected admin writes and customer-owned data.

## 9. Migrate old browser data

Older versions of the site may have records in browser localStorage. They are not automatically in the buyer's Firestore project.

When applicable:

1. Export a JSON backup from **Admin → Data & Backup**.
2. Finish the buyer-owned Firebase setup first.
3. Sign in as the authorized Firebase admin.
4. Run the protected legacy migration workflow.
5. Verify Firestore `products`, `promos`, `settings/store`, `content/gallery`, and `orders`.
6. Keep the old browser data until verification is complete.

## 10. GitHub Pages deployment

GitHub Pages hosts the static website. Firebase hosts the backend services.

After publishing the buyer's copy of the site:

- confirm the GitHub Pages domain is authorized in Firebase Authentication;
- confirm `js/firebase-config.js` uses the buyer's project;
- confirm Firestore rules were deployed to the buyer's project;
- confirm Cloud Functions were deployed to the buyer's project;
- test customer sign-in, admin sign-in, catalog sync, and checkout.

## 11. Security rules for buyers

Never commit:

- Firebase service-account JSON
- private keys
- Admin SDK credentials
- seller-owned Firebase project credentials

The values in `js/firebase-config.js` are public web-app configuration values, but the backend's service-account credentials must remain server-side.

For a public production deployment, review Firebase quotas, monitoring, Authorized Domains, and App Check.

## 12. Troubleshooting

**“Firebase is not configured.”**  
At least one value in `js/firebase-config.js` still starts with `REPLACE_WITH_`.

**“This email is not authorized.”**  
Check that the email in `functions/index.js` and `firestore.rules` matches the buyer's Firebase admin email exactly.

**Admin login succeeds but access is denied.**  
Check that `admins/{uid}` exists and contains `active: true` and `role: "admin"`.

**Functions fail after deployment.**  
Confirm `firebase use` points to the buyer's Firebase project, then deploy Functions again.

**GitHub Pages login fails.**  
Confirm the exact GitHub Pages hostname is listed in Firebase Authentication → Authorized domains.

**Orders fail because a product is missing.**  
Create or migrate the product documents in the buyer's Firestore project before using centralized checkout.

## Buyer checklist

```text
[ ] Created my own Firebase project
[ ] Added my own Firebase Web App
[ ] Replaced all Firebase placeholders in js/firebase-config.js
[ ] Chosen my own admin email
[ ] Replaced REPLACE_WITH_ADMIN_EMAIL in functions/index.js
[ ] Replaced REPLACE_WITH_ADMIN_EMAIL in firestore.rules
[ ] Enabled Firebase Authentication providers
[ ] Added my GitHub Pages domain to Authorized domains
[ ] Created my own Firebase admin user
[ ] Created admins/{uid} with active=true and role=admin
[ ] Deployed Firestore rules and Functions
[ ] Tested customer login
[ ] Tested admin login
[ ] Tested catalog/checkout
[ ] Verified Firestore data
]
```