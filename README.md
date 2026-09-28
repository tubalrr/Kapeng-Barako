# Kapeng Barako

Production-oriented artisan coffee storefront with a modular admin console and responsive premium UI.

## Project map

```text
Kapeng-Barako/
├── index.html
├── pages/
│   ├── admin.html                # legacy redirect
│   ├── contact.html
│   └── admin/
│       ├── login.html            # restricted admin gate
│       └── index.html            # protected dashboard
├── css/
│   ├── home.css
│   ├── admin.css
│   ├── admin-login.css
│   └── style.css
├── js/
│   ├── storefront.js
│   ├── conversion.js
│   ├── admin-auth.js
│   ├── admin.js
│   └── contact.js
└── images/
```

## Buyer handoff — edit safely

**Logo / favicon:** replace `images/favicon.svg` with the final approved logo/favicon. Storefront and admin browser tabs reference this local asset.

**Colors:** edit the variables at the top of `css/home.css` (`--espresso`, `--barako`, `--cream`, `--gold`). Keep the variable names unchanged so the component styling remains intact.

**Products:** Admin → Products controls names, prices, variants, weights, grind options, descriptions, and stock. The storefront reads `kb_products`.

**Contact + socials:** Admin → Store Settings controls the email, phone, location, Facebook, Instagram, TikTok, payment instructions, and fulfillment options. Do not replace HTML placeholders manually when the setting is available.

**Shipping:** Admin → Shipping Fees controls Batangas, Manila, province rates and the free-shipping rule. The checkout uses the delivery address to select the configured regional rate.

**Promos:** Admin → Pricing & Promos creates codes such as `BARAKO10`. Active minimum-pack and percentage/fixed rules are applied by the storefront checkout.

**Story / brew / FAQ / announcement:** Admin → Content & CMS controls the hero, story, 3 brew steps, FAQ, and fresh-roast announcement shown on the storefront.

**Images / video:** replace the local files in `/images` with approved buyer assets. The brew module uses `images/brew-placeholder.svg` until the final video/embed is supplied. Customer reviews intentionally do not use invented testimonials; publish only real, approved brand-owned screenshots/content.

**Wholesale / subscription:** the storefront can save wholesale inquiries and recurring-delivery preferences locally. True recurring billing, automated fulfillment, and business notifications require a backend service.

## Admin access

Open `/pages/admin/login.html`.

Default seed:
`admin@kapengbarako.com` / `barako123`

There is no public administrator registration. The dashboard checks a localStorage admin session, expires it after a fixed period, and logout clears it. The old `/pages/admin.html` path redirects into the new login gate.

**Security limit:** GitHub Pages + localStorage cannot provide a real server-side security boundary. The login gate is a client-side protection layer for this static build. Before handling real customer/payment data in production, connect authentication, orders, inventory, payment verification, file uploads, and admin authorization to a server-side backend.

## Current storage model

`kb_products`, `kb_settings`, `kb_cms`, `kb_gallery`, `kb_shipping_rule`, `kb_promos`, `kb_orders`, `kb_last_order`, plus local admin/session preferences.

## Deployment

This repository is compatible with GitHub Pages. Test the final buyer content on both desktop and mobile before launch, especially checkout forms, long product names, admin navigation, payment instructions, images, and the protected admin route.
