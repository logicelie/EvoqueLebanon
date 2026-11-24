# Evoque Lebanon: handoff

State as of 2026-11-23 (updated after the Vercel fix). Everything is on branch `claude/loving-shannon-6nzjxe` of `logicelie/EvoqueLebanon` (the repo's only branch; there is no `main`). No pull request has been opened.

## What this is

A Next.js 15 storefront for the Evoque Professional franchise in Lebanon, modelled on https://evoqueusa.com (a Shopify store on the Capital theme). The owner chose:

- a custom site in this repo, deployed on Vercel (not a Shopify store)
- ordering by WhatsApp with cash on delivery (no card payments)
- English only
- the same catalogue at the same USD prices
- no promotions on the Lebanon site

See `README.md` for structure, the sync script and which files to edit.

## What is done

- 101 products, 43 collections, 288 photos stored locally as resized WebP (`npm run sync` refreshes them from evoqueusa.com).
- Home page with the original's sections in order; product, collection, search, cart and checkout pages; hair quiz; Our Story, About, Vision & Mission, Delivery & Returns, Partners, Contact.
- Four guide pages and nine blog articles imported once into `data/content.json` (not refreshed by sync).
- `data/redirects.json`: old product and page links mapped to current ones.
- WhatsApp number set to `9613979313` (`+961 3 979 313`) in `data/site.json`. Email `hello@evoquelebanon.com` and Instagram `@evoquelebanon` (https://www.instagram.com/evoquelebanon/) confirmed by the owner.
- Delivery terms confirmed by the owner: $4 fee, free over $100, 1 to 3 business days, 14-day returns on unopened items (`DELIVERY_FEE` and `FREE_OVER` in `app/cart/page.tsx`).
- Promotions removed: no "Buy 3 Get 1 Free", no Black Friday hero or countdown, no `QUIZ10`. The hero is now a Smart Keratin photo with "Salon hair care. Now in Lebanon." To run a promotion later, fill `home.hero.offers` and `home.hero.countdownTo` in `data/site.json`.
- Verified locally: clean `npm ci && npm run build` generates 171 pages; all 464 internal links and images resolve; no horizontal overflow on desktop or mobile; add to cart through to the checkout form works. The final hand-off to WhatsApp was not tested with a real order.

## Deployment (Vercel)

Live at https://evoquelebanon.com (`www` and plain http redirect there; also https://evoque-lebanon.vercel.app). Vercel project `evoque-lebanon`, team `eliehaddad-2919's projects`, deploys automatically from `claude/loving-shannon-6nzjxe`. GoDaddy DNS: A `@` 216.198.79.1, CNAME `www` to `@`. Tested on the custom domain, desktop and mobile, same results as below.

- The first two deployments failed because Vercel refuses to ship next@15.3.3 (CVE-2025-66478): the build passed, then "Vulnerable version of Next.js detected". Fixed by upgrading to next 15.5.29 and React 19.2.9 (commit c765ec6).
- Tested live on desktop and mobile (iPhone 13): home, collection, product, add to cart, cart and checkout all load with no errors or horizontal overflow, and "Place order" opens WhatsApp to 9613979313 with the order filled in.
- The longer team URLs (`evoque-lebanon-eliehaddad-2919s-projects.vercel.app`) ask for a Vercel login (Standard Protection); `evoque-lebanon.vercel.app` and any custom domain are public.
- `npm audit` still reports postcss and sharp advisories that come through Next.js; only a Next 16 upgrade clears them. Vercel does not block on them.

## Staff portal (/admin)

Built on 2026-11-23: orders, stock, reports and staff logins, mobile first. It runs on Neon Postgres connected through Vercel (`DATABASE_URL`). If the database is ever disconnected the portal shows "database not connected" and the store falls back to WhatsApp-only ordering.

- **Database**: the owner agreed to Neon Postgres through Vercel (project, Storage, Create Database, Neon). `npm run build` runs `scripts/db-migrate.mjs` first, which applies `db/schema.sql` (idempotent) and, when there are no users, creates the first admin from the `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables (set on Vercel).
- **Checkout**: `app/(shop)/cart/page.tsx` posts to `app/api/orders/route.ts`, which saves the order (`lib/orders.ts`), takes tracked items out of stock and returns the number (`EV-1001`...). Prices are recomputed on the server. The thank-you page offers a pre-filled WhatsApp message. A 503 (no database) falls back to WhatsApp-only.
- **Roles**: `admin` sees everything. `driver` sees only orders ready for delivery or out with them (plus their deliveries of the last 7 days) and can mark out for delivery, delivered (with how it was paid) or "could not deliver".
- **Order statuses**: new, confirmed, out for delivery, delivered, cancelled, returned. Cancelled and returned put tracked items back in stock. Payment methods: cash on delivery, Whish, OMT.
- **New-order pop-up**: `NewOrdersPopup` in `components/admin/client.tsx`, shown on opening the portal and when the count rises (checked every 45 seconds). Admins: new orders. Drivers: orders ready for delivery.
- **Stock**: table `stock`, one row per size. Empty quantity = not tracked (always available). The portal can also set a Lebanon price, a cost and hide a product. `lib/catalog.ts` merges this into the store through a cache tagged `catalog`, refreshed on every change.
- **Reports**: `lib/reports.ts`; dates are Lebanon time. CSV export at `/admin/reports/export`.
- **Not built yet**: editing the items of an existing order (cancel it and create a new one instead); email alerts.
- **Tested** locally against Postgres 16 with a Playwright script (checkout, pop-up, confirm, overselling blocked, cancel restocks, driver permissions, delivery and cash, reports, CSV, manual order, mobile layouts): all passing. On 2026-11-24 the owner connected Neon; tested on the live site: checkout saved EV-1001 (a test order, since cancelled), pop-up, cancel, and all portal pages load.
- Storefront pages moved to `app/(shop)/` so the portal has its own layout; URLs did not change.

## Still needed from the owner

- Email for `hello@evoquelebanon.com`: the domain has no MX records, so mail to that address (shown on the site) is not delivered yet. Set up email (for example GoDaddy/Microsoft 365 or Google Workspace) and add its MX records in GoDaddy DNS.

## Known differences from evoqueusa.com

- Left out (Shopify add-ons): account login, reviews carousel, sign-up popup, Rewards widget, Shop Pay.
- Not copied: US legal and business pages (privacy, terms, wholesale, private label, international, careers, salon program) and four US wholesale blog articles. Links to wholesale and salon program redirect to Partners.
- The hair quiz is a shorter version, not the original's ten questions.
- The newsletter form only shows a thank-you message; it stores nothing.
- Five collection descriptions in `data/collections.json` still mention U.S. shipping. They come from the source and return on every sync, so fix them at render time or in an override rather than by editing the file.
- CSS and components are written for this project; the Capital theme's code was not copied.
