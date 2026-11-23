import fs from "node:fs";
import path from "node:path";

const CDN = "https://cdn.shopify.com/s/files/1/0089/9704/4286/";
let local: Record<string, string> | null = null;

/** Resolve an image key ("files/x.png") to the local copy if synced, else the Shopify CDN. */
export function img(key?: string | null, width?: number): string {
  if (!key) return "";
  if (/^https?:/.test(key)) return key;
  if (!local) {
    const p = path.join(process.cwd(), "data", "images.json");
    local = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  }
  if (local![key]) return local![key];
  return CDN + key + (width ? `?width=${width}` : "");
}
