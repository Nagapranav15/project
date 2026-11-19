# Jumper Loud — Shopify OS 2.0 theme

Built 1:1 from the Jumper homepage v4 draft (same CSS, type, images, motion and copy), extended to every Shopify template:
product, collection with filters, search with predictive results, bag drawer and bag page, pages, contact, blog, article,
404, password, gift card, customer accounts, and styled policy pages (privacy, terms, shipping, refund).

## Install on Shopify
- **Upload:** `npm run zip`, then Online Store → Themes → Add theme → Upload zip file → `jumper-loud-theme.zip`.
- **CLI:** `shopify theme dev` to preview against your store, then `shopify theme push --unpublished`.

## Local preview (no store needed)
`npm install && npm run serve`, then open http://localhost:4173.
It renders the real Liquid with liquidjs and a mock store; the bag, quick add and packs work through a fake cart.
Add `?noloader` to skip the loading screen.

## Setup after install
- **New in cards:** Home → Product cards → pick a collection. Until then four Drop 01 demo cards show.
- **Sizes:** products need an option called `Size` (S, M, L, XL). Change the name in Theme settings → Product cards.
- **Colour line on cards:** optional product metafields `custom.colour_label` (single line text) and `custom.swatch` (colour).
- **Corner label:** tag a product `New in` (or set another tag in Theme settings).
- **Build a pack:** Home → Pack builder → each Colour block → pick the product for that colour. A pack adds one line per
  colour, grouped in the bag as one boxed pack (`Pack: 3 pack`). Set the pack price with an automatic discount in Shopify admin.
- **Join the crew:** sign-ups go to Customers with the `newsletter` and `crew` tags and email marketing consent.
- **Menus:** Header → Main menu (empty shows Shop, Packs, Fit, The Crew). Footer columns take any menu.
- **Policies:** write them in Settings → Policies. The footer links to them and the theme styles the policy pages.
- **Cookie banner:** turn it on in Settings → Customer privacy; Shopify injects it on every page.

## Loading screen
Theme settings → Loading screen. The default is the existing inflating JUMPER loader (unchanged; first visit and every
refresh, `?loader` forces it, `?noloader` skips it). The homepage v4 badge-drop loader is the second option.
