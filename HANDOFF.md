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
- WhatsApp number set to `9613979313` (`+961 3 979 313`) in `data/site.json`. Email `hello@evoquelebanon.com` confirmed by the owner.
- Promotions removed: no "Buy 3 Get 1 Free", no Black Friday hero or countdown, no `QUIZ10`. The hero is now a Smart Keratin photo with "Salon hair care. Now in Lebanon." To run a promotion later, fill `home.hero.offers` and `home.hero.countdownTo` in `data/site.json`.
- Verified locally: clean `npm ci && npm run build` generates 171 pages; all 464 internal links and images resolve; no horizontal overflow on desktop or mobile; add to cart through to the checkout form works. The final hand-off to WhatsApp was not tested with a real order.

## Deployment (Vercel)

Live at https://evoque-lebanon.vercel.app (project `evoque-lebanon`, team `eliehaddad-2919's projects`, deploys automatically from `claude/loving-shannon-6nzjxe`).

- The first two deployments failed because Vercel refuses to ship next@15.3.3 (CVE-2025-66478): the build passed, then "Vulnerable version of Next.js detected". Fixed by upgrading to next 15.5.29 and React 19.2.9 (commit c765ec6).
- Tested live on desktop and mobile (iPhone 13): home, collection, product, add to cart, cart and checkout all load with no errors or horizontal overflow, and "Place order" opens WhatsApp to 9613979313 with the order filled in.
- The longer team URLs (`evoque-lebanon-eliehaddad-2919s-projects.vercel.app`) ask for a Vercel login (Standard Protection); `evoque-lebanon.vercel.app` and any custom domain are public.
- `npm audit` still reports postcss and sharp advisories that come through Next.js; only a Next 16 upgrade clears them. Vercel does not block on them.

## Still needed from the owner

- Instagram handle (the site links to `@evoquelebanon`, unconfirmed).
- Delivery terms. The site assumes a $4 fee, free delivery over $100, 1 to 3 business days, and 14-day returns on unopened items. The fee and threshold are `DELIVERY_FEE` and `FREE_OVER` in `app/cart/page.tsx`; the wording is in `data/site.json`, `data/pages.json` and `app/products/[handle]/page.tsx`.
- The GoDaddy domain name. To link it: add the domain (apex and `www`) under the Vercel project's Settings, Domains; in GoDaddy DNS set the A record for `@` and the CNAME for `www` to the values Vercel shows; turn off GoDaddy forwarding; leave MX records alone.

## Known differences from evoqueusa.com

- Left out (Shopify add-ons): account login, reviews carousel, sign-up popup, Rewards widget, Shop Pay.
- Not copied: US legal and business pages (privacy, terms, wholesale, private label, international, careers, salon program) and four US wholesale blog articles. Links to wholesale and salon program redirect to Partners.
- The hair quiz is a shorter version, not the original's ten questions.
- The newsletter form only shows a thank-you message; it stores nothing.
- Five collection descriptions in `data/collections.json` still mention U.S. shipping. They come from the source and return on every sync, so fix them at render time or in an override rather than by editing the file.
- CSS and components are written for this project; the Capital theme's code was not copied.
