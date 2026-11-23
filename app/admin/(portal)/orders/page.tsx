import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { DRIVER_SCOPE, Order } from "@/lib/orders";
import { STATUSES, Status } from "@/lib/shop";
import { money } from "@/lib/format";
import { Flash, Icon, PaidPill, StatusPill, fmtDateTime } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const PAGE = 50;

type SP = { status?: string; q?: string; from?: string; to?: string; page?: string; error?: string; ok?: string };

export default async function Orders({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const admin = user.role === "admin";
  const tabs: Status[] = admin ? (Object.keys(STATUSES) as Status[]) : ["confirmed", "out_for_delivery", "delivered"];
  const status = tabs.find((t) => t === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = []; const vals: unknown[] = [];
  if (!admin) { vals.push(user.id); where.push(DRIVER_SCOPE); }
  const scope = where.length ? `where ${where.join(" and ")}` : "";
  const counts = Object.fromEntries((await q<{ status: Status; n: number }>(`select o.status, count(*)::int as n from orders o ${scope} group by 1`, vals)).map((r) => [r.status, r.n]));

  if (status) { vals.push(status); where.push(`o.status = $${vals.length}`); }
  const term = (sp.q ?? "").trim();
  if (term) { vals.push(`%${term}%`); where.push(`(o.number ilike $${vals.length} or o.customer_name ilike $${vals.length} or o.phone ilike $${vals.length})`); }
  const isDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (admin && isDate(sp.from)) { vals.push(sp.from); where.push(`(o.created_at at time zone 'Asia/Beirut')::date >= $${vals.length}::date`); }
  if (admin && isDate(sp.to)) { vals.push(sp.to); where.push(`(o.created_at at time zone 'Asia/Beirut')::date <= $${vals.length}::date`); }
  const rows = await q<Order & { items: number }>(
    `select o.*, u.name as driver_name, (select coalesce(sum(qty),0)::int from order_items i where i.order_id = o.id) as items
     from orders o left join users u on u.id = o.driver_id ${where.length ? `where ${where.join(" and ")}` : ""}
     order by o.created_at desc limit ${PAGE + 1} offset ${(page - 1) * PAGE}`,
    vals,
  );
  const more = rows.length > PAGE;
  const link = (o: Partial<SP>) => {
    const p = new URLSearchParams();
    const all = { status, q: term, from: sp.from, to: sp.to, ...o };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, String(v));
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };
  const tabLabel = (t: Status) => (!admin && t === "confirmed" ? "Ready for delivery" : STATUSES[t]);

  return (
    <>
      <div className="adm-head">
        <h1>Orders</h1>
        {admin && <Link href="/admin/orders/new" className="btn"><Icon name="plus" size={18} />New order</Link>}
      </div>
      <Flash sp={sp} />
      <div className="tabs">
        <Link href={link({ status: undefined, page: undefined })} aria-current={!status}>All</Link>
        {tabs.map((t) => (
          <Link key={t} href={link({ status: t, page: undefined })} aria-current={status === t}>{tabLabel(t)}{counts[t] ? ` (${counts[t]})` : ""}</Link>
        ))}
      </div>
      <form className="filters" action="/admin/orders">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="f">Search<input name="q" defaultValue={term} placeholder="Order number, name or phone" /></label>
        {admin && <label className="f">From<input type="date" name="from" defaultValue={sp.from} /></label>}
        {admin && <label className="f">To<input type="date" name="to" defaultValue={sp.to} /></label>}
        <button className="btn ghost">Filter</button>
      </form>
      {!rows.length && <div className="card mut">No orders here.</div>}
      <ul className="olist">
        {rows.slice(0, PAGE).map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`}>
              <span className="t">{o.number} · {o.customer_name}</span>
              <span className="amt">{money(o.total)}</span>
              <span className="meta">
                <StatusPill s={o.status} />
                <PaidPill paid={o.paid} method={o.payment_method} />
                <span>{o.area}</span>
                <span>{o.items} item{o.items === 1 ? "" : "s"}</span>
                <span>{fmtDateTime(o.created_at)}</span>
                {o.driver_name && <span>Driver: {o.driver_name}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {(page > 1 || more) && (
        <div className="btnrow" style={{ marginTop: 16 }}>
          {page > 1 && <Link className="btn ghost" href={link({ page: String(page - 1) })}>Newer</Link>}
          {more && <Link className="btn ghost" href={link({ page: String(page + 1) })}>Older</Link>}
        </div>
      )}
    </>
  );
}
