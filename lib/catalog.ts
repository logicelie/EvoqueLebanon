import fs from "node:fs";
import path from "node:path";
import site from "@/data/site.json";

export type Variant = {
  id: number; title: string; price: string; compare_at_price: string | null;
  sku?: string; available: boolean; option1: string | null; option2?: string | null; option3?: string | null; image?: string | null;
};
export type Product = {
  id: number; handle: string; title: string; vendor?: string; product_type: string; tags: string[];
  body_html: string; options: { name: string; values: string[] }[]; variants: Variant[];
  images: { src: string; width?: number; height?: number }[];
};
export type Collection = { id: number; handle: string; title: string; description: string; image: string | null; products_count: number };
type Overrides = { hidden?: string[]; prices?: Record<string, string>; unavailable?: string[] };

const DATA = path.join(process.cwd(), "data");

/** Generated files from `npm run sync`; falls back to bundled sample data. */
function load<T>(name: string, fallback: T): T {
  for (const p of [path.join(DATA, name), path.join(DATA, "fixtures", name)]) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  }
  return fallback;
}

let cache: { products: Product[]; collections: Collection[]; membership: Record<string, string[]> } | null = null;

function db() {
  if (cache) return cache;
  const ov = load<Overrides>("overrides.json", {});
  const hidden = new Set(ov.hidden ?? []);
  const unavailable = new Set(ov.unavailable ?? []);
  const mult = Number(site.priceMultiplier) || 1;
  const fix = (v: string | null) => (v == null ? null : (Number(v) * mult).toFixed(2));
  const products = load<Product[]>("products.json", [])
    .filter((p) => !hidden.has(p.handle))
    .map((p) => ({
      ...p,
      variants: p.variants.map((v) => ({
        ...v,
        price: ov.prices?.[`${p.handle}:${v.title}`] ?? ov.prices?.[p.handle] ?? fix(v.price)!,
        compare_at_price: fix(v.compare_at_price),
        available: unavailable.has(p.handle) ? false : v.available,
      })),
    }));
  cache = {
    products,
    collections: load<Collection[]>("collections.json", []),
    membership: load<Record<string, string[]>>("collection-products.json", {}),
  };
  return cache;
}

export const allProducts = () => db().products;
export const getProduct = (h: string) => db().products.find((p) => p.handle === h) ?? null;
export const productsByHandles = (hs: string[]) => hs.map(getProduct).filter(Boolean) as Product[];

export function allCollections() {
  return db().collections.filter((c) => (db().membership[c.handle] ?? []).some((h) => getProduct(h)));
}

export function getCollection(handle: string): { collection: Collection; products: Product[] } | null {
  if (handle === "all") {
    return { collection: { id: 0, handle: "all", title: "All Products", description: "", image: null, products_count: db().products.length }, products: db().products };
  }
  const c = db().collections.find((x) => x.handle === handle);
  if (!c) return null;
  return { collection: c, products: productsByHandles(db().membership[handle] ?? []) };
}

export function search(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return db().products.filter((p) => [p.title, p.product_type, ...p.tags].join(" ").toLowerCase().includes(s));
}

export const badges = (p: Product) => p.tags.filter((t) => t.startsWith("_badge:")).map((t) => t.replace("_badge:", "").trim());

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => Number(v.price));
  const min = Math.min(...prices), max = Math.max(...prices);
  const v = p.variants.find((x) => Number(x.price) === min)!;
  return { min, max, from: min !== max, compare: v.compare_at_price && Number(v.compare_at_price) > min ? Number(v.compare_at_price) : null };
}
