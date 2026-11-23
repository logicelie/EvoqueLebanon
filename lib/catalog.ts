import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import site from "@/data/site.json";
import { hasDb, q } from "./db";

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

type Base = { products: Product[]; collections: Collection[]; membership: Record<string, string[]> };
let cache: Base | null = null;

/** The synced catalogue with data/overrides.json applied, before portal stock, prices and hidden flags. */
function base(): Base {
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

export type PortalData = { hidden: string[]; stock: Record<string, { qty: number | null; price: string | null }> };

/** Stock, Lebanon prices and hidden products set in the portal. Cached; the portal calls revalidateTag("catalog") on every change. */
const portalData = unstable_cache(
  async (): Promise<PortalData> => {
    const [hidden, stock] = await Promise.all([
      q<{ handle: string }>("select handle from product_settings where hidden"),
      q<{ variant_id: string; qty: number | null; price: string | null }>("select variant_id, qty, price from stock where qty is not null or price is not null"),
    ]);
    return { hidden: hidden.map((h) => h.handle), stock: Object.fromEntries(stock.map((r) => [r.variant_id, { qty: r.qty, price: r.price }])) };
  },
  ["catalog-portal-data"],
  { tags: ["catalog"], revalidate: 300 },
);

/** Every product including hidden ones, with portal prices but untouched availability. For the portal only. */
export const baseProducts = () => base().products;

async function db(): Promise<Base> {
  const b = base();
  if (!hasDb) return b;
  let pd: PortalData;
  try {
    pd = await portalData();
  } catch (e) {
    // The store must keep selling if the portal database is down: fall back to the plain catalogue.
    console.error("catalog: portal data unavailable", e);
    return b;
  }
  const hidden = new Set(pd.hidden);
  return {
    ...b,
    products: b.products
      .filter((p) => !hidden.has(p.handle))
      .map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const s = pd.stock[String(v.id)];
          if (!s) return v;
          const price = s.price ?? v.price;
          return {
            ...v,
            price,
            compare_at_price: v.compare_at_price && Number(v.compare_at_price) > Number(price) ? v.compare_at_price : null,
            available: v.available && (s.qty == null || s.qty > 0),
          };
        }),
      })),
  };
}

export const allProducts = async () => (await db()).products;
export const getProduct = async (h: string) => (await db()).products.find((p) => p.handle === h) ?? null;
export async function productsByHandles(hs: string[]) {
  const d = await db();
  return hs.map((h) => d.products.find((p) => p.handle === h)).filter(Boolean) as Product[];
}

export async function allCollections() {
  const d = await db();
  const live = new Set(d.products.map((p) => p.handle));
  return d.collections.filter((c) => (d.membership[c.handle] ?? []).some((h) => live.has(h)));
}

export async function getCollection(handle: string): Promise<{ collection: Collection; products: Product[] } | null> {
  const d = await db();
  if (handle === "all") {
    return { collection: { id: 0, handle: "all", title: "All Products", description: "", image: null, products_count: d.products.length }, products: d.products };
  }
  const c = d.collections.find((x) => x.handle === handle);
  if (!c) return null;
  return { collection: c, products: (d.membership[handle] ?? []).map((h) => d.products.find((p) => p.handle === h)).filter(Boolean) as Product[] };
}

export async function search(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return (await db()).products.filter((p) => [p.title, p.product_type, ...p.tags].join(" ").toLowerCase().includes(s));
}

export const badges = (p: Product) => p.tags.filter((t) => t.startsWith("_badge:")).map((t) => t.replace("_badge:", "").trim());

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => Number(v.price));
  const min = Math.min(...prices), max = Math.max(...prices);
  const v = p.variants.find((x) => Number(x.price) === min)!;
  return { min, max, from: min !== max, compare: v.compare_at_price && Number(v.compare_at_price) > min ? Number(v.compare_at_price) : null };
}
