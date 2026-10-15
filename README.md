# Jumper Loud — Shopify OS 2.0 theme

Built from Jumper Brand Guidelines v1.5. Lime leads, Ink and Paper support, one supporting colour at a time.
The wordmark, icons and all seven Banana Crew characters are vector artwork extracted from the guideline PDF
(`snippets/logo-*.liquid`, `snippets/character.liquid`). The photos come from the PDF too (`assets/*.jpg`).

## Install on Shopify
- **CLI:** `shopify theme dev` to preview against your store, then `shopify theme push --unpublished`.
- **Upload:** `npm run zip`, then Online Store → Themes → Add theme → Upload zip.

## Local preview (no store needed)
`npm install && npm run preview` renders the real Liquid into `dist/` using liquidjs and mock store data.
Serve it with `npx serve dist`. Add `?noloader` to the URL to skip the loading screen.

## Setup after install
- **Products:** assign a collection to *Featured prints*. Demo cards using brand photos show until you do.
- **Print name:** create a product metafield `custom.print` (single-line text). It fills the colour tab on cards and the product page.
- **Menus:** `main-menu` drives the header. Pick menus in the footer blocks.
- **Brand font:** Obviously is a licensed font. Upload it to `assets/`, add an `@font-face`, then set *Theme settings → Typography*. Until then the theme uses Archivo Expanded.
- **Loader:** the master JUMPER wordmark inflates letter by letter to fill the screen, then deflates back to the logo (after the Jitter "Morph inflating text" template). It plays on the first visit and on every reload or hard refresh. Toggle it in *Theme settings → Motion*. `?loader` forces it, `?noloader` skips it, and `?loaderT=1.2` freezes a frame for design review.
