# Final Browser QA — Kapeng Barako

Run this checklist on the deployed GitHub Pages site after Firebase configuration and deployment.

## Desktop
- [ ] Storefront loads with no console-breaking JavaScript error.
- [ ] Header/navigation renders correctly.
- [ ] Product cards show the admin-controlled catalog.
- [ ] Cart add/remove/quantity controls work.
- [ ] Checkout validates customer, address and payment fields.
- [ ] Signed-in customer can submit an order through the backend.
- [ ] Order confirmation shows the returned order reference.
- [ ] Admin login rejects wrong credentials.
- [ ] `pages/admin/login.html` is the only admin login flow.
- [ ] `pages/admin/index.html` never authenticates credentials directly and redirects unauthenticated users to login.
- [ ] Only the `kb_admin_session` app session key is used.
- [ ] Session expiry redirects to login without a redirect loop.
- [ ] Logout clears the app session and Firebase Auth session.
- [ ] Refreshing an active admin session does not send the user back to login.
- [ ] Authorized Firebase admin can enter the Admin Console.
- [ ] A non-admin Firebase account is rejected.
- [ ] Logout ends the Firebase session.
- [ ] Admin Overview, Orders, Inventory and Customers render.
- [ ] GCash orders show pending verification.
- [ ] Backend order/inventory operations are not silently dependent on localStorage when Firebase is live.
- [ ] Backup export/download works.

## Mobile — test around 390×844 and 768×1024
- [ ] Header and hamburger are usable.
- [ ] Admin sidebar opens/closes without horizontal overflow.
- [ ] Login works with the mobile keyboard.
- [ ] Product cards/cart remain readable.
- [ ] Checkout buttons remain reachable.
- [ ] Admin tables scroll horizontally rather than collapsing.
- [ ] Modals fit the viewport.
- [ ] No persistent horizontal scrollbar.

## Customer account authentication
- [ ] Login — valid credentials: verified customer can sign in and reaches My Account.
- [ ] Signup — new account: new email/password account is created, profile is saved, and verification email is sent.
- [ ] Wrong password: valid email + wrong password stays on Login and shows a generic credential error.
- [ ] Wrong email: valid-format unknown email stays on Login and shows a generic credential error.
- [ ] Email verification: unverified password user cannot enter My Account; login triggers a fresh verification email and keeps the user signed out until verified.
- [ ] Forgot password — existing email: reset request shows a non-enumerating success message.
- [ ] Forgot password — unknown email: UI shows the same non-enumerating success message rather than confirming whether an account exists.
- [ ] Google sign-in: enabled Google provider signs the customer in and creates/updates the customer profile.
- [ ] Google popup states: cancelled, blocked, duplicate-request, disabled-provider, and different-credential errors show readable messages.
- [ ] Logout: Logout signs out Firebase Auth and returns to the Login screen.
- [ ] Session persistence: after a successful verified login, refreshing the page keeps the customer signed in; closing and reopening the browser keeps the customer signed in when Firebase local persistence is available.
- [ ] Unverified session guard: a password-authenticated user with emailVerified=false is signed out instead of seeing private account data.
- [ ] Firebase placeholder state: with REPLACE_WITH_ config values, customer auth is disabled with a clear setup message; demo account remains available for UI testing.
- [ ] Demo account is labeled exactly **TEST / DEMO ACCOUNT**; no personal-looking demo identity is presented as a real customer.
- [ ] Demo orders, addresses, wishlist items and profile are visibly marked as demo/test data.
## Backend smoke test
- [ ] Firebase Auth login succeeds.
- [ ] `admins/{uid}` authorization is enforced.
- [ ] Firestore rules deploy successfully.
- [ ] `createOrder` succeeds for an authenticated customer.
- [ ] Invalid/insufficient stock is rejected server-side.
- [ ] Inventory reservation is atomic.
- [ ] Duplicate submission behavior is checked.
- [ ] Legacy migration is restricted to an authorized admin.
- [ ] Customer/admin Firestore reads match the intended permissions.

## Release gate
Do not call the build production-ready until the required boxes above pass on the actual deployed site and Firebase project.
