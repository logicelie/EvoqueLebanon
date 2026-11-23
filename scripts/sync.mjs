#!/usr/bin/env node
/**
 * Pulls the full Evoque catalog (products, collections, collection membership)
 * from the Evoque USA Shopify store and downloads every product + site image
 * into /public/images so the Lebanon site serves them locally.
 *
 *   npm run sync                 # catalog + images
 *   npm run sync -- --no-images  # catalog only (images hot-linked from Shopify CDN)
 *
 * Re-run any time to pick up new products. Edit data/overrides.json (prices,
 * hidden products, availability) instead of the generated files.
 */
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE = process.env.EVOQUE_SOURCE || "https://evoqueusa.com";
const CDN_PREFIX = "https://cdn.shopify.com/s/files/1/0089/9704/4286/";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "data");
const IMG_DIR = path.join(ROOT, "public", "images");
const WITH_IMAGES = !process.argv.includes("--no-images");
const WEB_IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "evoque-lebanon-sync/1.0" } });
      if (res.status === 429) { await sleep(2000 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

/** "https://cdn.shopify.com/s/files/1/0089/9704/4286/files/x.png?v=1" -> "files/x.png" */
export function imageKey(src) {
  if (!src) return null;
  let s = src.split("?")[0];
  s = s.replace(/^https?:/, "").replace(/^\/\//, "https://");
  if (s.startsWith(CDN_PREFIX)) return s.slice(CDN_PREFIX.length);
  const m = s.match(/\/cdn\/shop\/(.+)$/);
  if (m) return m[1];
  return s; // external absolute URL, kept as-is
}

async function fetchAllProducts() {
  const all = [];
  for (let page = 1; page < 50; page++) {
    const { products } = await getJSON(`${SOURCE}/products.json?limit=250&page=${page}`);
    if (!products.length) break;
    all.push(...products);
  }
  return all;
}

async function fetchCollections() {
  const all = [];
  for (let page = 1; page < 20; page++) {
    const { collections } = await getJSON(`${SOURCE}/collections.json?limit=250&page=${page}`);
    if (!collections.length) break;
    all.push(...collections);
  }
  return all;
}

async function fetchMembership(collections) {
  const map = {};
  for (const c of collections) {
    if (!c.products_count) { map[c.handle] = []; continue; }
    const handles = [];
    for (let page = 1; page < 20; page++) {
      const { products } = await getJSON(`${SOURCE}/collections/${c.handle}/products.json?limit=250&page=${page}`);
      if (!products.length) break;
      handles.push(...products.map((p) => p.handle));
    }
    map[c.handle] = handles;
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  return map;
}

function slimProduct(p) {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    product_type: p.product_type,
    tags: p.tags,
    body_html: p.body_html,
    options: p.options.map((o) => ({ name: o.name.trim(), values: o.values })),
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price,
      compare_at_price: v.compare_at_price,
      sku: v.sku,
      available: v.available,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      image: v.featured_image ? imageKey(v.featured_image.src) : null,
    })),
    images: p.images
      .map((i) => ({ src: imageKey(i.src), width: i.width, height: i.height }))
      .filter((i) => WEB_IMAGE.test(i.src)),
  };
}

function slimCollection(c) {
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    description: c.description,
    image: c.image ? imageKey(c.image.src) : null,
    products_count: c.products_count,
  };
}

/**
 * Images are saved as resized WebP (Shopify's CDN does the conversion), so the
 * repo stays small and pages load fast. SVG and GIF are kept as they are.
 */
async function downloadImages(keys, wideKeys = new Set()) {
  const map = {};
  const list = [...new Set(keys)].filter((k) => k && WEB_IMAGE.test(k) && !/^https?:/.test(k));
  let done = 0, failed = 0;
  const queue = [...list];
  async function worker() {
    while (queue.length) {
      const key = queue.shift();
      const raw = /\.(svg|gif)$/i.test(key);
      const rel = raw ? key : key + ".webp";
      const out = path.join(IMG_DIR, rel);
      const pub = "/images/" + rel.split("/").map(encodeURIComponent).join("/");
      const width = wideKeys.has(key) ? 2200 : 1400;
      try {
        await fs.access(out);
        map[key] = pub;
      } catch {
        try {
          const res = raw
            ? await fetch(CDN_PREFIX + key)
            : await fetch(`${CDN_PREFIX}${key}?width=${width}`, { headers: { accept: "image/webp" } });
          if (!res.ok) throw new Error(String(res.status));
          if (!raw && !/webp/.test(res.headers.get("content-type") || "")) throw new Error("not webp: " + res.headers.get("content-type"));
          await fs.mkdir(path.dirname(out), { recursive: true });
          await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
          map[key] = pub;
        } catch (e) {
          failed++;
          console.warn(`\n  ! image failed ${key}: ${e.message}`);
        }
      }
      done++;
      if (done % 20 === 0) process.stdout.write(`  ${done}/${list.length} images\r`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`  ${done - failed}/${list.length} images ready${failed ? `, ${failed} failed` : ""}`);
  return map;
}

async function main() {
  console.log(`Syncing catalog from ${SOURCE}`);
  await fs.mkdir(DATA, { recursive: true });

  const products = (await fetchAllProducts()).map(slimProduct);
  console.log(`  ${products.length} products`);
  const rawCollections = await fetchCollections();
  const collections = rawCollections.map(slimCollection);
  console.log(`  ${collections.length} collections — reading membership`);
  const membership = await fetchMembership(rawCollections);

  await fs.writeFile(path.join(DATA, "products.json"), JSON.stringify(products, null, 1));
  await fs.writeFile(path.join(DATA, "collections.json"), JSON.stringify(collections, null, 1));
  await fs.writeFile(path.join(DATA, "collection-products.json"), JSON.stringify(membership, null, 1));

  if (WITH_IMAGES) {
    const site = JSON.parse(await fs.readFile(path.join(DATA, "site.json"), "utf8"));
    const siteKeys = JSON.stringify(site).match(/(files|products|collections)\/[^"\s]+?\.(png|jpe?g|webp|gif|avif|svg)/gi) || [];
    const keys = [
      ...products.flatMap((p) => p.images.map((i) => i.src)),
      ...collections.map((c) => c.image),
      ...siteKeys,
    ];
    console.log("Downloading images");
    const map = await downloadImages(keys, new Set(siteKeys));
    await fs.writeFile(path.join(DATA, "images.json"), JSON.stringify(map, null, 1));
  }
  console.log("Done. Run `npm run dev` to preview.");
}

main().catch((e) => {
  console.error("Sync failed:", e.message);
  process.exit(1);
});
