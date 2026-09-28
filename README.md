# Kapeng Barako

Premium dark-theme artisan coffee storefront and static admin console for GitHub Pages.

## Architecture

- `index.html` — customer storefront
- `css/home.css` — storefront design system
- `js/storefront.js` — cart, checkout, tracking, stock and conversion logic
- `pages/admin/login.html` — restricted admin login gate
- `pages/admin/index.html` — dashboard
- `css/admin.css` / `js/admin.js` — dashboard UI and analytics
- `images/` — local logo and gallery placeholders

## Buyer handoff

### Logo
Replace `images/favicon.svg` with the approved brand logo/favicon. Keep the same filename.

### Colors
The premium dark palette is defined in `css/home.css`:
`--bg`, `--card`, `--border`, `--text`, `--gold`.

The admin palette is defined in `css/admin.css`.

### Products + inventory
The storefront uses `kb_rebuild_products` for the three collection products:
- 250g — ₱350
- 500g — ₱620
- 1kg — ₱1,150

Stock is stored with each product. A successful checkout deducts the ordered pack quantity automatically. Admin reads the same product records. At 5 packs or below, the inventory status is shown as a low-stock alert.

### Cart + orders
Cart: `kb_cart`.
Orders: `kb_orders`.
Latest order: `kb_last_order`.

The storefront validates current stock again immediately before creating an order.

### Shipping + promotions
Shipping rules can use `kb_shipping_rule`; promo rules use `kb_promos`. The checkout displays subtotal, shipping, discount and final total.

### Content
Admin → Content stores announcement/contact/social values through `kb_cms` and `kb_settings`. Do not publish invented farmer identities or customer testimonials. Add only approved brand content and real screenshots.

### Images + video
The brew guide uses `images/brew-placeholder.svg`. Replace it with the approved visual or adapt the video dialog to the final embed.
The Origin / Craft gallery uses `images/gallery-01.svg` through `images/gallery-06.svg`.

## Admin access

Open `/pages/admin/login.html`.

Default seed:
`admin@kapengbarako.com` / `barako123`

The current implementation is intentionally a client-side localStorage gate because this repository is static GitHub Pages. It is **not** a real server-side security boundary. Before using live customer/payment data at scale, add authenticated server-side authorization, database storage, secure file uploads, and payment verification.

## Sales chart

Admin uses Chart.js from a CDN for the last-7-days bar chart. If the CDN is unavailable, the dashboard includes a local bar fallback so the rest of the admin page still works.

## Mobile behavior

Storefront and admin sidebars use transform-based off-canvas motion:
- 3-line hamburger → X
- `0.35s cubic-bezier(.4,0,.2,1)` icon morph
- `0.45s cubic-bezier(.4,0,.2,1)` drawer slide
- overlay + body scroll lock
- desktop sidebar stays open in admin

## Deployment

Enable GitHub Pages from the `main` branch. The project requires no build step.
