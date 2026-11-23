import site from "@/data/site.json";

export const money = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: site.currency }).format(Number(n));
