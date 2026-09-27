# Kapeng Barako

A responsive Kapeng Barako coffee storefront prepared for client handoff and customization.

## Project Structure

```text
Kapeng-Barako/
├── index.html
├── images/
│   └── favicon.svg
├── css/
│   ├── style.css
│   └── home.css
├── js/
│   └── .gitkeep
└── pages/
    └── contact.html
```

## Paano palitan ang logo

### Browser tab favicon
Palitan ang file:

`/images/favicon.svg`

Panatilihin ang filename para hindi na kailangang baguhin ang HTML.

### Website logo / brand mark
Ang pangunahing **KB** brand mark ay nasa `index.html` at `pages/contact.html`.
Hanapin ang text na:

`KB`

at palitan ito ng preferred logo markup o initials ng client.

## Paano palitan ang products

Sa `index.html`, hanapin ang product catalog na nagsisimula sa:

`var ju=[`

Bawat product ay may:
- `name` — product name
- `price` — price in Philippine pesos
- `weight` — pack size
- `note` — short product description
- `emoji` — visual placeholder used by the current design

I-edit ang existing product entries para ilagay ang tunay na products ng client.

## Paano palitan ang contact information

Sa `pages/contact.html`, palitan ang placeholder:

`ILAG`

ng tunay na client contact details bago i-deliver ang website.

Para sa contact form, palitan din ang FormSubmit recipient:

`https://formsubmit.co/ILAG`

gamit ang tunay na receiving email ng client.

## Images

Lahat ng website image assets ay dapat ilagay sa:

`/images`

Gamitin ang local paths gaya ng:

`images/product-name.jpg`

o, mula sa `pages/`:

`../images/product-name.jpg`

Huwag gumamit ng external image-hosting links para sa client-owned image assets.

## Mobile / Responsive

The layout includes responsive breakpoints for phones, tablets, and desktop screens. Before delivery, test the site in Chrome DevTools using common mobile viewport sizes and verify:
- navigation and buttons remain usable
- product cards do not overflow horizontally
- checkout/cart panels fit the viewport
- Delivery & Payment content remains readable
- contact form fields remain inside the screen

## Site Title

The website title is:

**Kapeng Barako**

The local favicon is stored in:

`/images/favicon.svg`

## Client Handoff Checklist

Before selling or deploying the website:
1. Replace logo/branding.
2. Replace all product names, prices, descriptions, and product images.
3. Replace every `ILAG` placeholder with real client information.
4. Confirm payment, delivery, and shipping rules with the client.
5. Test desktop and mobile layouts.
6. Replace any remaining placeholder copy before final delivery.


## Admin Dashboard

Open `pages/admin.html` for the operations console covering:
- Advanced Order Management: Kanban/table views for Pending, Verified Payment, Processing/Roasting, Ready to Ship, Dispatched, Delivered, and Cancelled.
- Payment and fulfillment tagging for GCash, Maya, COD, Lalamove, J&T, LBC, and QC Meetup.
- Printable waybills, dispatch notification links, manual status overrides, and audit logs.
- Green-bean and packaging inventory with roast/expiry dates, batch/SKU tracking, low-stock thresholds, and stock-coverage forecasting.
- Financial ledger by payment channel, COGS, shipping subsidy, affiliate commission, CSV export, and print-to-PDF reporting.
- Voucher rules, customer segments, and the "Free shipping when you buy 2 packs or more" control.
- Story, delivery-policy, FAQ editing, and order-linked support tickets.

The dashboard intentionally starts with empty operational records rather than fake/demo data. Its default browser-local adapter is suitable for a single browser during client setup; a production multi-user OMS/CMS should connect the adapter to authenticated server-side storage, payment records, inventory, and messaging services.

### Customer information

The storefront checkout collects:
- Name
- Phone
- Optional email
- Delivery address
- Payment method
- Fulfillment method

Use the client's real values. No sample email or phone number is preloaded.
