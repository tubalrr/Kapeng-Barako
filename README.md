# Kapeng Barako

Responsive single-page coffee storefront with a separate Admin Dashboard.

## Structure

```text
Kapeng-Barako/
├── index.html
├── images/
│   ├── favicon.svg
│   ├── brew-placeholder.svg
│   └── gallery-01.svg … gallery-06.svg
├── css/
│   ├── home.css
│   ├── admin.css
│   └── style.css
├── js/
│   ├── storefront.js
│   ├── admin.js
│   └── contact.js
└── pages/
    ├── admin.html
    └── contact.html
```

## Buyer handoff

### Logo / favicon
Replace `images/favicon.svg` with the buyer’s final local logo or favicon. The same local asset is used by the storefront and admin browser tab.

### Colors
Main storefront colors are at the top of `css/home.css`:
`--brown`, `--cream`, `--sand`, `--accent`.
Change those variables to update the visual theme without rewriting the layout.

### Products
Open **Admin → Products**. Edit product names, prices, variants/weights, grind options, descriptions, and other catalog data there.

### Contact + social links
Open **Admin → Store Settings**. Replace every `ILAG` placeholder with the buyer’s real:
- email
- phone
- location
- Facebook URL
- Instagram URL
- TikTok URL

The storefront footer social buttons stay disabled until real URLs are configured.

### Story / benefits / brewing / FAQ / delivery
Open **Admin → Content & CMS**. The dashboard controls the hero copy, KWENTO story, exactly 3 benefits, exactly 3 brewing steps, delivery policy, and FAQ items.

### Gallery
Open **Admin → Gallery**. There are exactly 6 local gallery slots. Replace:
`images/gallery-01.svg` through `images/gallery-06.svg`
with the buyer’s final high-resolution images in `/images`, then update the six local paths/titles/captions in Admin.

The six current visuals are temporary local SVG placeholders; they are not intended as the buyer’s final photography.

### How to Brew video
The storefront uses `images/brew-placeholder.svg` as a local poster. Replace the video placeholder markup in `index.html` with the buyer’s final local video or approved embed code.

## Admin-controlled settings

The storefront reads these browser storage keys:
`kb_products`, `kb_settings`, `kb_cms`, `kb_gallery`, and `kb_shipping_rule`.

Orders are written to `kb_orders` and `kb_last_order`. The Admin dashboard uses the same records for order management, reporting, waybills, and audit logging.

## Mobile

The storefront and admin use responsive CSS breakpoints for phone, tablet, and desktop layouts. Check the final buyer content in Chrome DevTools before handoff, especially long product names, checkout fields, gallery images, and navigation.

## Important production note

This repository is a static GitHub Pages frontend. The current order/catalog/admin data adapter uses browser `localStorage` so the site can operate without seeded fake data. A true production multi-user system still needs authenticated server-side storage plus secure payment verification, order processing, inventory persistence, and real SMS/email integrations before handling live customer data at scale.
