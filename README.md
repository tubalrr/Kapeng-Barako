# Kapeng Barako

Production-oriented artisan coffee storefront with a modular admin console and premium customer-facing UI.

## Frontend storefront

The buyer-facing page is `/index.html`. Main modules include:

- Persistent premium navigation with Products, Farm Story, Brew Guide, Track Order, Cart, and My Account.
- Hero storytelling for Batangas Liberica and small-batch roasting.
- Product cards with weight variants, grind selection, stock-urgency badges, wishlist hearts, and cart actions.
- Checkout with GCash, Cash on Delivery, Bank Transfer, payment reference/proof fields, regional shipping, promos, and free-shipping rules.
- Track Order lookup using the order records available to the current static build.
- Wholesale Mode for 10kg+ quote requests.
- Auto-delivery preference capture.
- Farm Story, Brew Guide + 3-minute timer, Coffee Tips, Gallery, FAQ, and Contact.
- Optional GCash QR display during checkout when `settings.gcashQr` is configured.

## Safe customization

**Logo / favicon:** replace `images/favicon.svg` with the final approved logo/favicon.

**Colors:** edit the design variables near the top of `css/home.css`. Keep the existing variable names unchanged.

**Products:** Admin → Products writes product data to `kb_products`. The storefront reads that local data and falls back to built-in demo products.

**Contact + social links:** Admin → Store Settings writes `kb_settings`.

**GCash QR:** configure `gcashQr` in `kb_settings` with an approved image URL or local image path. The checkout only shows the QR when GCash is selected. Never publish a placeholder QR as a real payment destination.

**Shipping:** Admin → Shipping Fees controls regional rates and the free-shipping threshold.

**Promos:** Admin → Pricing & Promos controls active voucher rules applied by the storefront checkout.

**Story / brew / FAQ / announcement:** Admin → Content & CMS controls the storefront CMS values stored in `kb_cms`.

**Images / video:** replace approved local assets in `/images`. The brew modules use local placeholders until the final buyer-owned media is supplied.

**Reviews:** only publish real, approved customer feedback or screenshots. The static storefront does not scrape Facebook reviews automatically.

## Static-build limitations

GitHub Pages + browser localStorage provides the storefront experience but is not a server-side order system. Orders, subscriptions, wholesale requests, and tracking records remain browser-local unless a backend is connected.

True automated recurring fulfillment, shared multi-device live tracking, secure payment verification, uploaded payment files, and server-side admin authorization require a backend service.

## Performance

The storefront avoids continuous order polling, limits the wishlist observer to the product grid, lazy-loads gallery images, and avoids expensive full-screen compositing effects.

## Deployment

This repository is compatible with GitHub Pages. After publishing, hard-refresh with **Ctrl + Shift + R** when validating the latest frontend build. Test desktop and mobile separately, especially navigation, product variants, checkout, tracking, and payment fields.

## Admin access

Open `/pages/admin/login.html`.

Default seed:
`admin@kapengbarako.com` / `barako123`

GitHub Pages + localStorage cannot provide a real server-side security boundary. Connect authentication and business data to a backend before production use with real customer/payment information.
