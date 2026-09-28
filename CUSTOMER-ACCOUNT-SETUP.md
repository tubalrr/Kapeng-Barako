# Kapeng Barako Customer Account Portal

The portal is implemented in `pages/account.html` and uses Firebase Authentication + Cloud Firestore for private customer data.

## Enable these Firebase Authentication providers

- Email/Password
- Google

Disable public provider methods you do not intend to support.

## Required Firebase Web App configuration

Copy the Web App configuration from Firebase Console into:

`js/firebase-config.js`

Only the Web App config belongs in the browser. Never put Firebase Admin SDK credentials, service-account JSON, SMTP passwords, or private API secrets in GitHub Pages source.

## Firestore structure

```
users/{uid}
users/{uid}/addresses/{addressId}
users/{uid}/wishlist/{wishlistId}
orders/{orderId}
```

Orders are read by the customer using `customerUid == auth.uid`. The rules deliberately deny browser-side order creation/update/delete. A trusted backend/Cloud Function should create order documents after validating the checkout request.

## Email verification / OTP note

Firebase Authentication provides a secure email verification link through `sendEmailVerification()`. A true numeric email OTP requires a trusted server-side flow that creates, expires, rate-limits, and verifies codes before granting access. GitHub Pages alone cannot safely perform that function.

For a real OTP flow, use a Cloud Function/server endpoint plus an email delivery provider. Keep OTP generation, hashing, expiration, retry limits, and abuse controls server-side.

## Product wishlist integration

The account portal is ready for wishlist documents. The storefront should write wishlist entries to:

`users/{uid}/wishlist/{productVariantId}`

with fields such as `productId`, `name`, `weight`, `grind`, and `createdAt`.

## Production checklist

1. Configure Firebase Auth.
2. Configure Google OAuth in Firebase.
3. Configure Firestore.
4. Deploy and test `firestore.rules`.
5. Add a trusted checkout backend/Cloud Function that writes validated orders.
6. Add the server-side email OTP flow if numeric OTP is mandatory.
7. Enable email-enumeration protection and appropriate Auth quotas/rate limits.
8. Consider Firebase App Check for the web app.
