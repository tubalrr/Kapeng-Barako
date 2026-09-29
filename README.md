# Kapeng Barako

Kapeng Barako is a dark-theme artisan coffee storefront template with a customer account area, admin console, browser-side catalog/content workflows, and optional Firebase/Firestore backend integration.

This repository is intended as a **website/template that the buyer configures and deploys**. It is **not a fully hosted multi-tenant SaaS** operated by the seller.

## Current repository structure

### Frontend

- `index.html` — main customer storefront
- `style.css` — main storefront stylesheet
- `script.js` — storefront UI, products, cart, checkout, gallery, promos, reviews, contact/social content, ads, and browser-side synchronization
- `pages/account.html` — customer account/login page
- `css/account.css` — customer account styles
- `js/account.js` — customer authentication, profile, address book, order tracking, and account data
- `pages/admin/login.html` — admin login entry point
- `css/admin-login.css` — admin login styles
- `js/admin-auth.js` — Firebase admin authentication/authorization guard
- `pages/admin/index.html` — admin console and management UI

### Backend / Firebase

- `js/firebase-config.js` — buyer-owned Firebase Web App configuration placeholder
- `js/firebase-backend.js` — frontend client for backend order/auth-related operations
- `functions/index.js` — Firebase Cloud Functions, including server-side order creation and migration callables
- `functions/package.json` — Cloud Functions dependencies and Node.js runtime configuration
- `firestore.rules` — Firestore security rules
- `firestore.indexes.json` — Firestore indexes
- `firebase.json` — Firebase Functions/Firestore deployment configuration

### Documentation

- `docs/FIREBASE_SETUP.md` — buyer Firebase installation and deployment guide
- `docs/QA_CHECKLIST.md` — desktop, mobile, authentication, backend, and release QA checklist

## Storage key registry

The browser-side storage keys below are the current documented registry. These keys are implementation details for browser/local workflows; they are **not a replacement for a production database**.

### Canonical application keys

| Key | Purpose | Primary owner |
|---|---|---|
| `kb_rebuild_products` | Current Admin-controlled product catalog/cache | Admin + storefront |
| `kb_orders` | Browser order cache / local order records | Storefront + account + admin |
| `kb_cart` | Customer shopping cart | Storefront |
| `kb_gallery` | Admin-controlled gallery content | Admin + storefront |
| `kb_reviews` | Reviews displayed by the storefront | Admin + storefront |
| `kb_promos` | Promo/voucher definitions | Admin + storefront |
| `kb_cms` | CMS/announcement content | Admin + storefront |
| `kb_settings` | Store/contact/settings data | Admin + storefront |
| `kb_store_settings` | Store-level operational settings | Admin |
| `kb_ads` | Advertisement configuration | Admin + storefront |
| `kb_activity_log` | Admin activity/audit log | Admin |
| `kb_inventory_history` | Inventory change history | Admin |
| `kb_notification_read` | Admin notification read-state | Admin |
| `kb_demo_customer_v1` | Demo/test customer data flag/state | Customer demo |
| `kb_admin_session` | Current browser admin session metadata | Admin authentication |
| `kb_checkout_default` | Customer's selected default checkout address | Customer account |
| `kb_pending_order_id` | Pending order reference during checkout recovery | Storefront |
| `kb_announcement_closed` | Session-only announcement dismissal | Storefront |
| `kb_checkout_return` | Checkout return/navigation state | Storefront |
| `kb_cookie_consent` | Cookie/consent UI state | Storefront |
| `kb_admin_catalog_updated` | Admin catalog update marker | Admin |
| `kb_adv_last_products` | Previous product snapshot used for inventory-change detection | Admin |
| `kb_low_stock_sound` | Admin low-stock notification sound preference/state | Admin |
| `kb_contact_messages` | Locally saved contact form messages when no business email is configured | Contact page |
| `kb_last_order` | Last order UI cache used to prefill/reopen tracking | Storefront |
| `kb_subscription_preference` | Customer delivery preference saved by the storefront | Storefront |
| `kb_wholesale_request` | Latest wholesale quote request pointer | Storefront |
| `kb_wholesale_requests` | Wholesale quote request history saved by the storefront | Storefront |

### Transitional / legacy keys

These keys should **not** be used for new features:

- `kb_admin` — legacy admin session key; current auth uses `kb_admin_session`.
- `kb_admin_firebase` — legacy Firebase admin session key; retained only for migration/cleanup.
- `kb_admin_email_for_signin` — legacy admin sign-in helper key; not part of the current authentication contract.
- `kb_shipping_rule` — legacy storefront key retained for compatibility; review/remove it when the shipping implementation no longer depends on it.

The current authentication cleanup intentionally removes obsolete admin session keys when the current Admin authentication module initializes. This is different from actively using those keys as the authentication source.

### Naming rule for future development

Use the `kb_` prefix for browser storage keys and add a key to this registry before introducing it. Do not create aliases such as `kb_products` when the canonical product key is already `kb_rebuild_products`.

If a key is replaced, document the replacement and migration/cleanup behavior rather than silently leaving multiple competing keys in the template.

## Folder structure

The Admin Console runtime is consolidated in **`js/admin.js`** so the dashboard no longer relies on multiple inline Admin script blocks.

The following structure reflects the current repository layout:

```
/
├── index.html
├── style.css
├── script.js
├── images/
├── css/
│   ├── account.css
│   └── admin-login.css
├── js/
│   ├── account.js
│   ├── admin-auth.js
│   ├── admin.js
│   ├── firebase-backend.js
│   └── firebase-config.js
├── pages/
│   ├── account.html
│   └── admin/
│       ├── index.html
│       └── login.html
├── functions/
│   ├── index.js
│   └── package.json
├── docs/
│   ├── FIREBASE_SETUP.md
│   └── QA_CHECKLIST.md
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── README.md
```

### What each part does

- **`index.html`** — main customer storefront page.
- **`style.css`** — global/main storefront styling.
- **`script.js`** — storefront behavior including catalog rendering, cart, checkout, promos, gallery, reviews, contact/social content, ads, and browser-side synchronization.
- **`images/`** — storefront image assets such as product/gallery artwork and the site favicon.
- **`css/`** — page-specific stylesheets:
  - **`account.css`** — customer account UI styling.
  - **`admin-login.css`** — admin login UI styling.
- **`js/`** — browser-side JavaScript modules:
  - **`account.js`** — customer authentication, profile, addresses, and order tracking.
  - **`admin-auth.js`** — Admin Console authentication and authorization guard.
  - **`firebase-backend.js`** — frontend integration with Firebase backend operations.
  - **`firebase-config.js`** — buyer's Firebase Web App configuration placeholder.
- **`pages/account.html`** — customer account/login interface.
- **`pages/admin/index.html`** — Admin Console interface and management logic.
- **`pages/admin/login.html`** — dedicated Admin login page.
- **`functions/index.js`** — server-side Firebase Cloud Functions.
- **`functions/package.json`** — Cloud Functions package/dependency configuration.
- **`docs/FIREBASE_SETUP.md`** — Firebase installation, configuration, and deployment instructions.
- **`docs/QA_CHECKLIST.md`** — browser, authentication, backend, and release testing checklist.
- **`firestore.rules`** — Firestore access-control rules.
- **`firestore.indexes.json`** — Firestore query indexes.
- **`firebase.json`** — Firebase CLI configuration for Functions and Firestore.
- **`README.md`** — project overview, architecture, limitations, setup, and deployment documentation.

## Main features

### Storefront

- Product catalog
- Product images and metadata
- Featured products
- Cart and quantity controls
- Checkout
- Address handling
- Promo/voucher support
- GCash reference collection
- Order confirmation
- Gallery
- Reviews
- Contact information and social links
- Advertisement controls

### Customer accounts

- Firebase Authentication when configured
- Customer profile
- Address book
- Default checkout address
- Customer order history
- Order tracking/status display

### Admin console

- Overview dashboard
- Orders and order tracking
- Customers
- Products
- Inventory
- Promos
- Gallery
- Reviews
- Contact/settings
- Ads
- Analytics
- Notifications
- Activity/audit log
- Backup and restore
- Orders CSV export

The Admin Console is available at `pages/admin/index.html` and uses `pages/admin/login.html` as its login entry point.

## Authentication and admin security

Customer authentication uses Firebase Authentication when a buyer configures Firebase.

The Admin Console uses the buyer's Firebase Authentication project and checks authorization through:

`admins/{uid}` → `{ active: true, role: "admin" }`

### Important admin limitation

**This template uses client-side authentication for demo/template purposes. It is not suitable as a secure production admin authentication system without a backend.**

GitHub Pages is static hosting. A browser-side authentication guard cannot by itself provide a server-side security boundary. For production use, protected operations should be enforced by trusted backend code and appropriate Firebase/Firestore Security Rules.


## Backend and multi-user architecture

The repository includes Firebase Cloud Functions and Firestore integration for buyers who configure their own Firebase project.

For a real multi-user store, the buyer needs:

- **Firebase/Firestore or another backend** for shared application data
- **Authenticated admin access**
- **Server-side authorization** for protected operations
- **A proper database** for customer, order, inventory, and business records
- **Secure file storage** for production uploads/assets where required
- **Payment verification** through a real payment gateway or a controlled manual verification workflow

The buyer is responsible for configuring, deploying, securing, and operating these services.

## GCash limitation

**GCash reference collection is for order recording. Actual payment verification requires a real payment gateway or manual admin verification.**

The Admin Console may record a GCash reference and a payment-review status, but a reference number does **not** prove that payment was completed or verified.

This template does not claim to provide automatic GCash payment verification.

## Browser localStorage limitation

Some template features use browser `localStorage` for local/demo records, cached data, and browser-side workflows.

**localStorage is browser-specific and is not a shared database.**

This means:

- **Browser A ≠ Browser B**
- **Device A ≠ Device B**
- Clearing browser/site data can remove local records.
- Local browser records are not guaranteed backups.
- Local browser data should not be treated as the canonical production database.

Use the configured Firebase/Firestore backend for data that must be shared or persisted centrally. Use the supported backup/export features for local records when appropriate.

## Product, gallery, and content source of truth

The Admin Console provides management interfaces for the product catalog and storefront content.

When Firebase catalog synchronization is configured, the backend catalog can serve as the canonical product source. Browser/local data may still be used for UI caching and local workflows.

The template should not be marketed as having a seller-operated private customer database. Buyers must configure their own Firebase project and backend.

## Analytics and reporting

Admin analytics are intended to derive from available order/product records rather than fabricated business numbers.

Where the repository does not have reliable traffic/session data, metrics such as conversion are not invented from order counts.

## Backup and CSV export

The Admin Console provides:

- JSON business-data backup
- JSON restore with validation and confirmation
- Orders CSV export

The Orders CSV contains:

- Order ID
- Date
- Customer
- Email
- Phone
- Address
- Items
- Total
- Payment
- GCash Ref
- Status

Local browser backup/export does not replace a proper production database backup strategy.

## Firebase setup

**Buyers must create and use their own Firebase project.**

Do not reuse the seller's Firebase project, Firebase admin UID, credentials, or service-account keys.

Basic setup:

1. Create a Firebase project.
2. Add a Firebase Web App.
3. Put the buyer-owned Web App configuration into `js/firebase-config.js`.
4. Enable the required Firebase Authentication providers.
5. Configure the buyer's admin email and `admins/{uid}` authorization.
6. Deploy Firestore rules and Cloud Functions.
7. Test authentication, checkout, orders, inventory, and admin authorization.

Follow the complete guide in `docs/FIREBASE_SETUP.md`.

Never commit a Firebase Admin SDK service-account JSON, private key, or other backend secret.

## Deployment

### GitHub Pages

The public/static UI can be hosted on GitHub Pages.

The current repository's main storefront is:

`index.html`

The customer account page is:

`pages/account.html`

The Admin login page is:

`pages/admin/login.html`

The Admin Console is:

`pages/admin/index.html`

### Firebase

Firebase services are deployed separately from GitHub Pages.

The repository's `firebase.json` currently configures:

- Cloud Functions from `functions`
- Firestore rules from `firestore.rules`
- Firestore indexes from `firestore.indexes.json`

Typical Firebase deployment commands are documented in `docs/FIREBASE_SETUP.md`.

## Contact information

Contact details are buyer-configured and are not pre-filled with fake business information.

- Business address/location, phone number, business email, and social media URLs remain empty until the store owner supplies them.
- Admin Contact Manager placeholders are explicitly labeled **Example only** and are not published automatically.
- Do not publish template/demo contact details as if they belong to the buyer's business.
- Storefront contact and social sections stay hidden when no real values have been configured.

## Customer data and demo claims

The template does **not** claim to have real customers, real customer reviews, real sales history, or a seller-operated customer database.

- Demo customer identities use explicit **TEST CUSTOMER** labels and `.invalid` email addresses.
- Demo orders and demo products exist only to exercise the UI/demo workflow and are not real business records.
- The storefront does not inject fake customer reviews. Reviews are shown only when they are explicitly marked verified and published by the Admin workflow.
- Production customer counts, sales, revenue, and order history must come from actual configured backend records.
- Do not use demo names, demo orders, demo reviews, or demo metrics as testimonials or evidence of real store activity.

## Production-readiness disclaimer

This repository is a **template/starter implementation**, not a seller-operated hosted commerce platform.

Before using it for a real store, the buyer should configure and verify:

- Firebase project ownership
- Authentication
- Firestore rules
- Cloud Functions
- Server-side authorization
- Database access
- File storage
- Payment verification
- Backups
- Domain/deployment configuration
- Browser/mobile QA

Do not market the Gumroad product as a fully hosted SaaS with a private customer database unless those services are actually provided and operated as part of the product.

## QA

Use `docs/QA_CHECKLIST.md` for the final browser and backend smoke tests.

A production deployment should not be considered complete until the buyer's Firebase configuration, backend deployment, security rules, payment workflow, and browser QA have been tested on the actual deployed site.
