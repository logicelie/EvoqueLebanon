import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { baseProducts } from "@/lib/catalog";
import { Flash } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";
import StockRow, { StockItem } from "@/components/admin/StockRow";
import { hideProductAction } from "../../actions";

export const metadata = { title: "Stock" };
type SP = { q?: string; show?: string; error?: string; ok?: string };
type Row = { variant_id: string; qty: number | null; low_alert: number; price: string | null; cost: string | null };

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("admin");
  const sp = await searchParams;
  const [stockRows, hiddenRows] = await Promise.all([
    q<Row>("select variant_id, qty, low_alert, price, cost from stock"),
    q<{ handle: string }>("select handle from product_settings where hidden"),
  ]);
  const stock = Object.fromEntries(stockRows.map((r) => [r.variant_id, r]));
  const hidden = new Set(hiddenRows.map((h) => h.handle));
  const term = (sp.q ?? "").trim().toLowerCase();
  const show = ["low", "out", "tracked", "hidden"].includes(sp.show ?? "") ? sp.show! : "all";

  const products = baseProducts().map((p) => ({
    p,
    items: p.variants.map((v): StockItem => {
      const s = stock[String(v.id)];
      return {
        variantId: String(v.id), label: v.title === "Default Title" ? "One size" : v.title, listPrice: Number(v.price).toFixed(2),
        qty: s?.qty ?? null, low: s?.low_alert ?? 3, price: s?.price ?? null, cost: s?.cost ?? null, hidden: hidden.has(p.handle),
      };
    }),
  }));
  const match = (i: StockItem) =>
    show === "all" ? true : show === "hidden" ? i.hidden : show === "tracked" ? i.qty != null : show === "out" ? i.qty != null && i.qty <= 0 : i.qty != null && i.qty > 0 && i.qty <= i.low;
  const list = products
    .filter(({ p }) => !term || p.title.toLowerCase().includes(term))
    .map((x) => ({ ...x, items: show === "all" || show === "hidden" ? x.items : x.items.filter(match) }))
    .filter((x) => x.items.some(match));
  const all = products.flatMap((x) => x.items);
  const count = (f: (i: StockItem) => boolean) => all.filter(f).length;
  const tab = (key: string, label: string) => (
    <Link href={`/admin/products?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(key !== "all" ? { show: key } : {}) })}`} aria-current={show === key}>{label}</Link>
  );
  const here = `/admin/products?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(show !== "all" ? { show } : {}) })}`;

  return (
    <>
      <div className="adm-head"><h1>Stock</h1></div>
      <p className="mut sm">Leave “In stock” empty for a product you don’t count: it stays available. Enter a number to track it; at 0 the store shows it as sold out. “Price” replaces the list price on the store.</p>
      <Flash sp={sp} />
      <div className="tabs">
        {tab("all", `All (${all.length})`)}
        {tab("low", `Low (${count((i) => i.qty != null && i.qty > 0 && i.qty <= i.low)})`)}
        {tab("out", `Sold out (${count((i) => i.qty != null && i.qty <= 0)})`)}
        {tab("tracked", `Tracked (${count((i) => i.qty != null)})`)}
        {tab("hidden", `Hidden (${hidden.size})`)}
      </div>
      <form className="filters" action="/admin/products">
        {show !== "all" && <input type="hidden" name="show" value={show} />}
        <label className="f">Search<input name="q" defaultValue={sp.q} placeholder="Product name" /></label>
        <button className="btn ghost">Search</button>
      </form>
      {!list.length && <div className="card mut">Nothing to show.</div>}
      <div className="stack">
        {list.map(({ p, items }) => (
          <section className="card" key={p.handle}>
            <div className="adm-head" style={{ marginBottom: 0 }}>
              <h2 style={{ margin: 0 }}><Link href={`/products/${p.handle}`} target="_blank">{p.title}</Link></h2>
              <form action={hideProductAction}>
                <input type="hidden" name="handle" value={p.handle} />
                <input type="hidden" name="hidden" value={hidden.has(p.handle) ? "0" : "1"} />
                <input type="hidden" name="back" value={here} />
                <Submit className="btn ghost sm">{hidden.has(p.handle) ? "Show on store" : "Hide from store"}</Submit>
              </form>
            </div>
            {items.map((i) => <StockRow key={i.variantId} item={i} />)}
          </section>
        ))}
      </div>
    </>
  );
}
