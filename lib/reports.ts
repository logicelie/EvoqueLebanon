import { q } from "./db";
import { baseProducts } from "./catalog";

const DAY = (col: string) => `(${col} at time zone 'Asia/Beirut')::date`;
/** Orders that count as sales: everything except cancelled and returned. */
const SOLD = "status not in ('cancelled','returned')";

export async function summary(from: string, to: string) {
  const r = [from, to];
  const [[placed], [collected], byMethod, [delivered], [owed]] = await Promise.all([
    q<{ orders: number; sales: string; cancelled: number }>(
      `select count(*) filter (where ${SOLD})::int as orders, coalesce(sum(total) filter (where ${SOLD}), 0) as sales,
              count(*) filter (where status in ('cancelled','returned'))::int as cancelled
       from orders where ${DAY("created_at")} between $1 and $2`, r),
    q<{ amount: string }>(`select coalesce(sum(total), 0) as amount from orders where paid and ${DAY("paid_at")} between $1 and $2`, r),
    q<{ payment_method: string; orders: number; amount: string }>(
      `select payment_method, count(*)::int as orders, sum(total) as amount from orders where paid and ${DAY("paid_at")} between $1 and $2 group by 1 order by 3 desc`, r),
    q<{ orders: number; cost: string }>(
      `select count(*)::int as orders, coalesce(sum(delivery_cost), 0) as cost from orders where status = 'delivered' and ${DAY("delivered_at")} between $1 and $2`, r),
    // Not date-bound: money you are still waiting for right now.
    q<{ orders: number; amount: string }>(`select count(*)::int as orders, coalesce(sum(total), 0) as amount from orders where not paid and status in ('out_for_delivery','delivered')`),
  ]);
  return {
    orders: placed.orders, sales: Number(placed.sales), cancelled: placed.cancelled,
    collected: Number(collected.amount), byMethod: byMethod.map((m) => ({ ...m, amount: Number(m.amount) })),
    delivered: delivered.orders, deliveryCost: Number(delivered.cost),
    owedOrders: owed.orders, owed: Number(owed.amount),
  };
}

export const byDay = (from: string, to: string) =>
  q<{ day: string; orders: number; sales: string; collected: string }>(
    `select to_char(d, 'YYYY-MM-DD') as day,
            (select count(*)::int from orders where ${SOLD} and ${DAY("created_at")} = d) as orders,
            (select coalesce(sum(total), 0) from orders where ${SOLD} and ${DAY("created_at")} = d) as sales,
            (select coalesce(sum(total), 0) from orders where paid and ${DAY("paid_at")} = d) as collected
     from generate_series($1::date, $2::date, interval '1 day') as g(d) order by d desc`, [from, to]);

export const topProducts = (from: string, to: string) =>
  q<{ title: string; variant_title: string; qty: number; revenue: string }>(
    `select i.title, i.variant_title, sum(i.qty)::int as qty, sum(i.qty * i.price) as revenue
     from order_items i join orders o on o.id = i.order_id
     where o.${SOLD} and ${DAY("o.created_at")} between $1 and $2 group by 1, 2 order by 3 desc, 4 desc limit 15`, [from, to]);

export const byArea = (from: string, to: string) =>
  q<{ area: string; orders: number; sales: string }>(
    `select area, count(*)::int as orders, sum(total) as sales from orders where ${SOLD} and ${DAY("created_at")} between $1 and $2 group by 1 order by 3 desc`, [from, to]);

/** Tracked stock: units, value at selling price and at cost (where a cost was entered), and the low or sold-out sizes. */
export async function stockOverview() {
  const rows = await q<{ variant_id: string; qty: number; low_alert: number; price: string | null; cost: string | null }>("select variant_id, qty, low_alert, price, cost from stock where qty is not null");
  const names = new Map(baseProducts().flatMap((p) => p.variants.map((v) => [String(v.id), { label: v.title === "Default Title" ? p.title : `${p.title} · ${v.title}`, price: Number(v.price) }] as const)));
  let units = 0, retail = 0, cost = 0, missingCost = 0;
  const low: { label: string; qty: number }[] = [];
  for (const r of rows) {
    const n = names.get(r.variant_id);
    if (!n) continue;
    units += r.qty; retail += r.qty * Number(r.price ?? n.price);
    if (r.cost != null) cost += r.qty * Number(r.cost); else if (r.qty > 0) missingCost++;
    if (r.qty <= r.low_alert) low.push({ label: n.label, qty: r.qty });
  }
  return { tracked: rows.length, units, retail, cost, missingCost, low: low.sort((a, b) => a.qty - b.qty) };
}
