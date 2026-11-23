import fs from "node:fs";

// Old links that still appear in product descriptions and articles.
const redirects = JSON.parse(fs.readFileSync(new URL("./data/redirects.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
export default {
  images: { unoptimized: true },
  async redirects() {
    return Object.entries(redirects).map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};
