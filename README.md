# Evoque Lebanon

Next.js 15 storefront for Evoque Professional in Lebanon, modelled on evoqueusa.com: same products, photos, collections and homepage layout, adapted for Lebanon (USD pricing, delivery across Lebanon, cash on delivery, WhatsApp ordering).

## Quick start

```bash
npm install
npm run sync      # pulls all ~100 products, 40+ collections and every photo from evoqueusa.com
npm run dev       # http://localhost:3000
```

Until you run `npm run sync`, the site shows a small sample catalog from `data/fixtures/`.

`npm run sync` writes:

| File | What it holds |
| --- | --- |
| `data/products.json` | Every product: title, description, variants, prices, images |
| `data/collections.json` | Every collection |
| `data/collection-products.json` | Which products belong to which collection |
| `data/images.json` + `public/images/` | Local copies of all product, banner and homepage photos, saved as resized WebP |

Commit these files so production never depends on the US site. Re-run `npm run sync` whenever Evoque adds products. Use `npm run sync -- --no-images` to refresh data only (any image not downloaded is loaded from Shopify's CDN).

## Things to edit before launch

- **`data/site.json`**: WhatsApp number, phone, email, Instagram, announcement bar, menus, homepage sections (hero offer and countdown date, featured product, collection tiles). `priceMultiplier` scales every USD price; `currency` can be changed.
- **`data/overrides.json`**: Lebanon-specific changes that survive re-syncs:
  - `"hidden": ["product-handle"]` hides products you don't stock
  - `"unavailable": ["product-handle"]` marks them sold out
  - `"prices": { "product-handle": "28.00", "handle:Variant title": "12.00" }` sets local prices
- **`data/pages.json`**: Our Story, About, Vision & Mission, Delivery & Returns, Partners
- **`app/cart/page.tsx`**: delivery fee (`DELIVERY_FEE`) and free-delivery threshold (`FREE_OVER`)

## Guides, blog and old links

- **`data/content.json`**: the hair-care guide pages (`/pages/explore-evoque-milk-therapy`, `smart-amino-keratin`, `non-ammonia`, `brave-by-evoque`) and the Hair Care Guide blog articles (`/blogs/hair-care-guide`). This was imported once from evoqueusa.com and is not refreshed by `npm run sync`; edit it by hand.
- **`data/redirects.json`**: old product and page links that still appear in descriptions and articles, mapped to their current pages.

## How ordering works

The cart is stored in the browser. At checkout, customers fill in name, phone, area and address, and the order opens in WhatsApp as a pre-filled message to your number (cash on delivery). To take card payments later, swap the `submit` function in `app/cart/page.tsx` for a payment gateway (for example Areeba or Stripe).

The newsletter form and the contact form are front-end only: the newsletter shows a thank-you message and the contact form opens WhatsApp. Connect them to your email tool when ready.

## Deploy

Push to GitHub and import into Vercel (no environment variables needed). Run `npm run sync` locally and commit the data first, or set the Vercel build command to `npm run build:fresh` to sync on each deploy.

## Structure

```
app/            pages: home, collections, products, cart, search, /pages/*
components/     Header, Footer, ProductCard, Cart (provider + drawer), AddToCart, etc.
lib/            catalog loader (+ overrides), image resolver, money format
data/           site config, page copy, synced catalog
scripts/sync.mjs
```
