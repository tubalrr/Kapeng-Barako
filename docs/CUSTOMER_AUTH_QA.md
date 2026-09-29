# Customer Account Auth QA — Buyer Test Script

Run this after the buyer has completed Firebase setup and deployed the site.

## Test account preparation

Use a buyer-controlled test mailbox. Create one verified customer account and keep a second unused email address for the unknown-email test.

For Google testing, use a buyer-controlled Google account and enable Google Sign-in in the buyer's Firebase project.

## 1. Login

Expected:
- Verified account + correct password → My Account dashboard.
- User remains signed in after refresh.
- No private account data is rendered before authentication completes.

## 2. Signup

Expected:
- Fill Full Name, Phone, Email, Password, Confirm Password and Terms.
- A new Firebase Auth user is created.
- Customer profile is written to users/{uid}.
- Verification email is sent.
- User is signed out and returned to Login.
- Attempting to log in before verification does not enter the private account.

## 3. Wrong password

Use an existing verified email with an incorrect password.

Expected:
- Login fails.
- User remains on Login.
- Error is generic: Email or password is incorrect.
- No account data is shown.

## 4. Wrong email

Use a syntactically valid email that does not belong to a test account.

Expected:
- Login fails.
- User remains on Login.
- Error is generic: Email or password is incorrect.

## 5. Email verification

Using a newly created password account:
1. Open the verification email.
2. Verify the account.
3. Return to Login.
4. Sign in with the correct password.

Expected:
- Verified account enters My Account.
- Unverified account never receives private account data.
- Re-login of an unverified password account triggers a fresh verification email.

## 6. Forgot password

Test an existing email and an unknown email.

Expected:
- Existing email → reset email is sent.
- Unknown email → the same generic success message is shown.
- The UI does not reveal whether an account exists.

## 7. Google sign-in

Expected:
- Continue with Google opens Google Auth.
- Successful sign-in creates or updates users/{uid}.
- Google-authenticated customer enters My Account.
- Provider is recorded as google.com.

Also test popup cancel, popup blocked, Google provider disabled, duplicate popup request, and a different sign-in credential.

Each state should keep the user on a usable auth screen with a readable error.

## 8. Logout

Expected:
1. Sign in.
2. Click Logout.
3. User returns to Login.
4. Refresh the page.

The user must remain signed out and no private account data should load.

## 9. Session persistence

Expected:
1. Sign in with a verified password account.
2. Refresh the page.
3. Close the browser tab.
4. Reopen the Account page in the same browser profile.

The customer should remain signed in because customer auth explicitly uses Firebase browserLocalPersistence.

Also test a manual Logout before closing the browser. After Logout, reopening the page must show Login.

## Release evidence

Record the test date, browser, device size, buyer-owned Firebase project, and the result of every state above.

Do not ship with the seller's Firebase project or seller admin identity.