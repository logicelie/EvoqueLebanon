import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { byArea, byDay, stockOverview, summary, topProducts } from "@/lib/reports";
import { PAYMENTS } from "@/lib/shop";
import { money } from "@/lib/format";
import { Flash, fmtDate, today } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";
import { settingsAction } from "../../actions";

export const metadata = { title: "Reports" };
type SP = { from?: string; to?: string; error?: string; ok?: string };
const isDate = (d?: string): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

export default async function Reports({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("admin");
  const sp = await searchParams;
  const t = today();
  let from = isDate(sp.from) ? sp.from : `${t.slice(0, 8)}01`;
  const to = isDate(sp.to) ? sp.to : t;
  if (from > to) from = to;
  if (Date.parse(to) - Date.parse(from) > 366 * 864e5) from = shift(to, -366);
  const [s, days, top, areas, stock, [setting]] = await Promise.all([
    summary(from, to), byDay(from, to), topProducts(from, to), byArea(from, to), stockOverview(),
    q<{ value: string }>("select value from settings where key = 'default_delivery_cost'"),
  ]);
  const maxDay = Math.max(1, ...days.map((d) => Number(d.sales)));
  const range = (label: string, f: string, tt: string) => <Link href={`/admin/reports?from=${f}&to=${tt}`} aria-current={from === f && to === tt}>{label}</Link>;
  const lastMonthEnd = shift(`${t.slice(0, 8)}01`, -1);

  return (
    <div className="stack">
      <div className="adm-head" style={{ marginBottom: 0 }}>
        <h1>Reports</h1>
        <a className="btn ghost" href={`/admin/reports/export?from=${from}&to=${to}`}>Download orders (CSV)</a>
      </div>
      <Flash sp={sp} />
      <div>
        <div className="tabs" style={{ marginBottom: 8 }}>
          {range("Today", t, t)}
          {range("Last 7 days", shift(t, -6), t)}
          {range("This month", `${t.slice(0, 8)}01`, t)}
          {range("Last month", `${lastMonthEnd.slice(0, 8)}01`, lastMonthEnd)}
        </div>
        <form className="filters" action="/admin/reports" style={{ marginBottom: 0 }}>
          <label className="f">From<input type="date" name="from" defaultValue={from} /></label>
          <label className="f">To<input type="date" name="to" defaultValue={to} /></label>
          <button className="btn ghost">Show</button>
        </form>
      </div>
      <p className="mut sm" style={{ margin: 0 }}>{fmtDate(`${from}T12:00:00Z`)} to {fmtDate(`${to}T12:00:00Z`)}. Sales count orders placed in this period, without cancelled and returned ones. Collected counts money received in this period.</p>

      <div className="kpis">
        <div className="kpi"><div className="l">Sales</div><div className="v">{money(s.sales)}</div><div className="s">{s.orders} order{s.orders === 1 ? "" : "s"} · average {money(s.orders ? s.sales / s.orders : 0)}</div></div>
        <div className="kpi"><div className="l">Collected</div><div className="v">{money(s.collected)}</div><div className="s">Money received</div></div>
        <div className="kpi"><div className="l">Delivery costs</div><div className="v">{money(s.deliveryCost)}</div><div className="s">{s.delivered} delivered</div></div>
        <div className="kpi"><div className="l">Collected after delivery</div><div className="v">{money(s.collected - s.deliveryCost)}</div><div className="s">Collected minus delivery costs</div></div>
        <div className="kpi"><div className="l">Still to collect</div><div className="v">{money(s.owed)}</div><div className="s">{s.owedOrders} unpaid orders, as of now</div></div>
        <div className="kpi"><div className="l">Cancelled or returned</div><div className="v">{s.cancelled}</div><div className="s">Orders placed in this period</div></div>
        <div className="kpi"><div className="l">Stock at selling price</div><div className="v">{money(stock.retail)}</div><div className="s">{stock.units} units in {stock.tracked} tracked sizes</div></div>
        <div className="kpi"><div className="l">Stock at cost</div><div className="v">{money(stock.cost)}</div><div className="s">{stock.missingCost ? `${stock.missingCost} sizes have no cost entered` : "All tracked sizes have a cost"}</div></div>
      </div>

      <div className="cols cols2">
        <section className="card">
          <h2>Collected by payment method</h2>
          {!s.byMethod.length ? <p className="mut sm">No money received in this period.</p> : (
            <table>
              <thead><tr><th>Method</th><th className="right">Orders</th><th className="right">Amount</th></tr></thead>
              <tbody>{s.byMethod.map((m) => <tr key={m.payment_method}><td>{PAYMENTS[m.payment_method as keyof typeof PAYMENTS]}</td><td className="right num">{m.orders}</td><td className="right num">{money(m.amount)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2>Sales by area</h2>
          {!areas.length ? <p className="mut sm">No orders in this period.</p> : (
            <table>
              <thead><tr><th>Area</th><th className="right">Orders</th><th className="right">Sales</th></tr></thead>
              <tbody>{areas.map((a) => <tr key={a.area}><td>{a.area}</td><td className="right num">{a.orders}</td><td className="right num">{money(a.sales)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Best sellers</h2>
        {!top.length ? <p className="mut sm">No orders in this period.</p> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Product</th><th className="right">Units</th><th className="right">Sales</th></tr></thead>
              <tbody>{top.map((p) => <tr key={p.title + p.variant_title}><td>{p.title}{p.variant_title !== "Default Title" && <span className="mut"> · {p.variant_title}</span>}</td><td className="right num">{p.qty}</td><td className="right num">{money(p.revenue)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Day by day</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Day</th><th className="right">Orders</th><th className="right">Sales</th><th style={{ width: "30%" }}><span className="mut">Sales</span></th><th className="right">Collected</th></tr></thead>
            <tbody>
              {days.slice(0, 92).map((d) => (
                <tr key={d.day}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(`${d.day}T12:00:00Z`)}</td>
                  <td className="right num">{d.orders}</td>
                  <td className="right num">{money(d.sales)}</td>
                  <td>{Number(d.sales) > 0 && <div className="bar" style={{ width: `${(Number(d.sales) / maxDay) * 100}%` }} />}</td>
                  <td className="right num">{money(d.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {days.length > 92 && <p className="mut sm">Showing the latest 92 days. Download the CSV for everything.</p>}
      </section>

      <section className="card">
        <h2>Delivery cost</h2>
        <form className="filters" action={settingsAction} style={{ marginBottom: 0 }}>
          <label className="f">What you pay the delivery company per order (USD)<input name="default_delivery_cost" inputMode="decimal" defaultValue={setting?.value ?? "3"} required /></label>
          <Submit className="btn ghost">Save</Submit>
        </form>
        <p className="mut sm" style={{ marginBottom: 0 }}>Filled in on each order when it is delivered. You can change it on a single order.</p>
      </section>
    </div>
  );
}
