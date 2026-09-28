# Firebase Setup — Kapeng Barako

This project uses **Firebase Authentication + Firestore + Cloud Functions** while the public UI remains hosted on GitHub Pages.

## 1. Create/select the Firebase project

1. Open the Firebase Console and create or select the project for Kapeng Barako.
2. Add a **Web App** to that project.
3. Copy the Web App configuration values: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
4. Put those values in `js/firebase-config.js`.
5. Do **not** paste a service-account private key into the website config.

## 2. Enable Authentication

In Firebase Console → Authentication → Sign-in method, enable **Email/Password** and create the admin account(s).

The Admin Console and customer accounts use the same Firebase project.

## 3. Create the admin authorization document

After creating the admin Authentication user, copy its Firebase **UID**.

Create this Firestore document:

`admins/{UID}`

with:

```text
active: true
role: "admin"
```

The website does not trust an email address or localStorage flag for admin access. It checks this document after Firebase Authentication succeeds.

## 4. Deploy Firestore rules and Functions

From the repository root:

```bash
firebase login
firebase use <YOUR_FIREBASE_PROJECT_ID>
firebase deploy --only firestore:rules,functions
```

If the project has not been linked yet, initialize it first:

```bash
firebase init firestore functions
```

Keep the repository's existing `firebase.json`, `firestore.rules` and `functions/` configuration unless you intentionally change the architecture.

## 5. Migrate legacy browser data

The old site stored some catalog/orders in browser localStorage. That data is not automatically visible to Firebase.

Migration must be started from a browser that still contains the legacy records:

1. Export a JSON backup from Admin → Data & Backup.
2. Configure Firebase.
3. Sign in with an authorized Firebase admin.
4. Run the protected migration workflow/tool.
5. Confirm Firestore `products`, `promos`, `settings/store`, `content/gallery` and `orders` contain the expected records.
6. Keep the old localStorage copy until the Firestore data is verified.

## 6. GitHub Pages

GitHub Pages serves the static UI from `main`. It does not deploy Firebase Cloud Functions.

After publishing, verify the production site can load the Firebase Web SDK, Authentication, Firestore and callable Functions. If the config remains placeholder text, the UI intentionally reports that onboarding is incomplete.

## 7. Security notes

- Never put service-account JSON, private keys or Admin SDK credentials in the repository.
- Browser writes to `orders` are blocked; order creation is performed by the callable backend.
- Product/catalog writes are admin-only.
- GCash remains manual/pending verification until a supported payment gateway or verification integration is added.
- For a public production launch, enable Firebase App Check and review Auth, Firestore and Functions quotas/monitoring.

## 8. Troubleshooting

**Firebase is not configured.** Check all six Web App config values in `js/firebase-config.js`.

**This account is not authorized.** The Firebase Auth user exists, but `admins/{uid}.active` is missing or false.

**Functions fail after deployment.** Confirm `firebase use` matches the `projectId` in the Web App config, then redeploy Functions.

**Orders fail because a product is missing.** Migrate/create the product documents in Firestore before using centralized checkout.
