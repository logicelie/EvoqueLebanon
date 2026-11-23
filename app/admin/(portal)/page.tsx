import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { Order } from "@/lib/orders";
import { stockOverview, summary } from "@/lib/reports";
import { money } from "@/lib/format";
import { PaidPill, StatusPill, fmtDateTime, today } from "@/components/admin/ui";

export const metadata = { title: "Home" };

export default async function Dashboard() {
  await requireUser("admin");
  const t = today(), monthStart = `${t.slice(0, 8)}01`;
  const [day, month, stock, [open], latest] = await Promise.all([
    summary(t, t), summary(monthStart, t), stockOverview(),
    q<{ fresh: number; confirmed: number; out: number }>(
      "select count(*) filter (where status = 'new')::int as fresh, count(*) filter (where status = 'confirmed')::int as confirmed, count(*) filter (where status = 'out_for_delivery')::int as out from orders"),
    q<Order>("select * from orders order by created_at desc limit 6"),
  ]);
  return (
    <div className="stack">
      <div className="adm-head" style={{ marginBottom: 0 }}><h1>Today</h1></div>
      <div className="kpis">
        <Link className="kpi" href="/admin/orders?status=new"><div className="l">New orders</div><div className="v">{open.fresh}</div><div className="s">Waiting for you to confirm</div></Link>
        <Link className="kpi" href="/admin/orders?status=confirmed"><div className="l">To deliver</div><div className="v">{open.confirmed + open.out}</div><div className="s">{open.confirmed} ready · {open.out} out with driver</div></Link>
        <div className="kpi"><div className="l">Sales today</div><div className="v">{money(day.sales)}</div><div className="s">{day.orders} order{day.orders === 1 ? "" : "s"}</div></div>
        <div className="kpi"><div className="l">Collected today</div><div className="v">{money(day.collected)}</div><div className="s">Money received</div></div>
        <Link className="kpi" href="/admin/reports"><div className="l">Sales this month</div><div className="v">{money(month.sales)}</div><div className="s">{month.orders} order{month.orders === 1 ? "" : "s"}</div></Link>
        <Link className="kpi" href="/admin/reports"><div className="l">Collected this month</div><div className="v">{money(month.collected)}</div><div className="s">After delivery costs: {money(month.collected - month.deliveryCost)}</div></Link>
        <div className="kpi"><div className="l">Still to collect</div><div className="v">{money(month.owed)}</div><div className="s">{month.owedOrders} unpaid, out or delivered</div></div>
        <Link className="kpi" href="/admin/products?show=low"><div className="l">Low stock</div><div className="v">{stock.low.length}</div><div className="s">Sizes at or under their alert level</div></Link>
      </div>
      <div className="cols cols2">
        <section className="card">
          <h2>Latest orders</h2>
          {!latest.length && <p className="mut sm">No orders yet. They appear here as soon as a customer checks out.</p>}
          <ul className="olist">
            {latest.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} style={{ border: 0, padding: "10px 0", borderBottom: "1px solid #f1f1f3", borderRadius: 0 }}>
                  <span className="t">{o.number} · {o.customer_name}</span><span className="amt">{money(o.total)}</span>
                  <span className="meta"><StatusPill s={o.status} /><PaidPill paid={o.paid} method={o.payment_method} /><span>{fmtDateTime(o.created_at)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Low or sold out</h2>
          {!stock.low.length ? <p className="mut sm">{stock.tracked ? "Nothing is running low." : "No product is being counted yet. Enter quantities on the Stock page."}</p> : (
            <table>
              <tbody>{stock.low.slice(0, 10).map((l) => <tr key={l.label}><td>{l.label}</td><td className="right num"><span className={`pill ${l.qty <= 0 ? "unpaid" : "confirmed"}`}>{l.qty <= 0 ? "Sold out" : `${l.qty} left`}</span></td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
