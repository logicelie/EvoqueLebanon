import type { PoolClient } from "pg";
import { allProducts, baseProducts } from "./catalog";
import { q, tx } from "./db";
import { AREAS, PAYMENTS, STATUSES, Payment, Status, deliveryFee } from "./shop";
import type { User } from "./auth";

/** An error whose message is safe to show to the customer or staff member. */
export class OrderError extends Error {}

export type OrderInput = {
  items: { handle: string; variant: string; qty: number }[];
  name: string; phone: string; area: string; address: string; notes?: string;
  payment: Payment;
  source: "web" | "manual";
  user?: User;
  ipHash?: string;
  /** Manual orders only: overrides the standard delivery fee. */
  deliveryFee?: number;
};

export type Order = {
  id: number; number: string; created_at: Date; status: Status; source: string;
  customer_name: string; phone: string; area: string; address: string; notes: string; internal_note: string;
  subtotal: string; delivery_fee: string; total: string; delivery_cost: string | null;
  payment_method: Payment; paid: boolean; paid_at: Date | null; delivered_at: Date | null;
  driver_id: number | null; driver_name?: string | null;
};
export type OrderItem = { id: number; variant_id: string; handle: string; title: string; variant_title: string; price: string; qty: number };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

async function event(c: PoolClient, orderId: number, user: User | undefined, text: string) {
  await c.query("insert into order_events (order_id, user_id, text) values ($1, $2, $3)", [orderId, user?.id ?? null, text]);
}

export async function createOrder(input: OrderInput): Promise<{ id: number; number: string; total: number; subtotal: number; delivery: number; lines: { title: string; variant: string; qty: number; price: number }[] }> {
  const name = clean(input.name, 120), phone = clean(input.phone, 40), address = clean(input.address, 400), notes = clean(input.notes, 600);
  const area = AREAS.find((a) => a === input.area);
  if (!name || !address || !area) throw new OrderError("Please fill in your name, area and address.");
  if (phone.replace(/\D/g, "").length < 7) throw new OrderError("Please enter a valid phone number.");
  if (!(input.payment in PAYMENTS)) throw new OrderError("Please choose a payment method.");
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 60) throw new OrderError("Your cart is empty.");

  // Prices always come from the catalogue, never from the browser. Staff can sell hidden or sold-out-on-site products.
  const products = input.source === "manual" ? baseProducts() : await allProducts();
  const live = input.source === "manual" ? await allProducts() : products;
  const lines = input.items.map((i) => {
    const qty = Math.floor(Number(i.qty));
    const p = products.find((x) => x.handle === i.handle);
    const v = p?.variants.find((x) => x.title === i.variant);
    if (!p || !v || !(qty > 0) || qty > 99) throw new OrderError("An item in your cart is no longer available. Please refresh the page.");
    const lv = live.find((x) => x.handle === p.handle)?.variants.find((x) => x.id === v.id);
    if (input.source === "web" && !v.available) throw new OrderError(`${p.title} is sold out.`);
    return { id: v.id, handle: p.handle, title: p.title, variant: v.title, qty, price: Number((lv ?? v).price) };
  });
  const subtotal = Math.round(lines.reduce((a, l) => a + l.price * l.qty, 0) * 100) / 100;
  const delivery = input.source === "manual" && input.deliveryFee != null && input.deliveryFee >= 0 ? Math.round(input.deliveryFee * 100) / 100 : deliveryFee(subtotal);
  const total = Math.round((subtotal + delivery) * 100) / 100;

  return tx(async (c) => {
    // Lock and check stock first so a refused order does not use up an order number.
    const before = new Map<number, number>();
    for (const l of [...lines].sort((x, y) => x.id - y.id)) {
      const { rows: [s] } = await c.query("select qty from stock where variant_id = $1 for update", [l.id]);
      if (!s || s.qty == null) continue;
      const want = lines.filter((x) => x.id === l.id).reduce((a, x) => a + x.qty, 0);
      if (s.qty < want) {
        throw new OrderError(s.qty > 0 ? `Only ${s.qty} left of ${l.title}${l.variant !== "Default Title" ? ` (${l.variant})` : ""}. Please lower the quantity.` : `${l.title} is sold out.`);
      }
      before.set(l.id, s.qty);
    }
    const { rows: [o] } = await c.query(
      `insert into orders (source, customer_name, phone, area, address, notes, subtotal, delivery_fee, total, payment_method, created_by, ip_hash, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
      [input.source, name, phone, area, address, notes, subtotal, delivery, total, input.payment, input.user?.id ?? null, input.ipHash ?? null, input.source === "manual" ? "confirmed" : "new"],
    );
    const number = `EV-${1000 + o.id}`;
    await c.query("update orders set number = $1 where id = $2", [number, o.id]);
    for (const l of lines) {
      if (before.has(l.id)) {
        const { rows: [s] } = await c.query("update stock set qty = qty - $1 where variant_id = $2 returning qty", [l.qty, l.id]);
        await c.query("insert into stock_moves (variant_id, user_id, order_id, delta, qty_after, reason) values ($1,$2,$3,$4,$5,$6)", [l.id, input.user?.id ?? null, o.id, -l.qty, s.qty, `Order ${number}`]);
      }
      await c.query("insert into order_items (order_id, variant_id, handle, title, variant_title, price, qty) values ($1,$2,$3,$4,$5,$6,$7)", [o.id, l.id, l.handle, l.title, l.variant, l.price, l.qty]);
    }
    await event(c, o.id, input.user, input.source === "manual" ? "Order created by staff" : "Order placed on the website");
    return { id: o.id as number, number, total, subtotal, delivery, lines };
  });
}

async function restock(c: PoolClient, orderId: number, number: string, user: User, why: string) {
  const { rows } = await c.query("select variant_id, qty from order_items where order_id = $1", [orderId]);
  for (const r of rows) {
    const { rows: [s] } = await c.query("update stock set qty = qty + $1 where variant_id = $2 and qty is not null returning qty", [r.qty, r.variant_id]);
    if (s) await c.query("insert into stock_moves (variant_id, user_id, order_id, delta, qty_after, reason) values ($1,$2,$3,$4,$5,$6)", [r.variant_id, user.id, orderId, r.qty, s.qty, `${why} ${number}`]);
  }
}

const NEXT: Record<Status, Status[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "confirmed", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const DRIVER: Partial<Record<Status, Status[]>> = { confirmed: ["out_for_delivery"], out_for_delivery: ["delivered", "confirmed"] };

/** Statuses this user may move the order to. */
export function nextStatuses(o: Pick<Order, "status" | "driver_id">, user: User): Status[] {
  if (user.role === "admin") return NEXT[o.status];
  if (o.driver_id != null && o.driver_id !== user.id) return [];
  return DRIVER[o.status] ?? [];
}

export async function changeStatus(orderId: number, to: Status, user: User, opts: { note?: string; paidVia?: Payment | "unpaid" } = {}) {
  return tx(async (c) => {
    const { rows: [o] } = await c.query("select * from orders where id = $1 for update", [orderId]);
    if (!o) throw new OrderError("Order not found.");
    if (!nextStatuses(o, user).includes(to)) throw new OrderError(`This order is ${STATUSES[o.status as Status].toLowerCase()} and can't be changed to ${STATUSES[to].toLowerCase()}.`);
    const note = clean(opts.note, 300);
    if (to === "confirmed" && o.status === "out_for_delivery" && !note) throw new OrderError("Please say why it could not be delivered.");
    const sets = ["status = $2"]; const vals: unknown[] = [orderId, to];
    let text = `Marked ${STATUSES[to].toLowerCase()}`;
    if (to === "out_for_delivery" && (user.role === "driver" || o.driver_id == null)) { vals.push(user.id); sets.push(`driver_id = $${vals.length}`); }
    if (to === "confirmed" && o.status === "out_for_delivery") text = "Could not be delivered, back to confirmed";
    if (to === "delivered") {
      sets.push("delivered_at = now()", "delivery_cost = coalesce(delivery_cost, (select value::numeric from settings where key = 'default_delivery_cost'))");
      if (!o.paid && opts.paidVia && opts.paidVia !== "unpaid" && opts.paidVia in PAYMENTS) {
        vals.push(opts.paidVia); sets.push(`payment_method = $${vals.length}`, "paid = true", "paid_at = now()");
        text += `, ${Number(o.total).toFixed(2)} USD received (${PAYMENTS[opts.paidVia]})`;
      } else if (!o.paid) text += ", payment not received yet";
    }
    if (to === "cancelled" || to === "returned") {
      await restock(c, orderId, o.number, user, to === "cancelled" ? "Cancelled" : "Returned");
      if (o.paid) { sets.push("paid = false", "paid_at = null"); text += ", payment marked as refunded"; }
    }
    await c.query(`update orders set ${sets.join(", ")} where id = $1`, vals);
    await event(c, orderId, user, note ? `${text}: ${note}` : text);
  });
}

export async function setPaid(orderId: number, paid: boolean, method: Payment, user: User) {
  return tx(async (c) => {
    const { rows: [o] } = await c.query("select status, paid from orders where id = $1 for update", [orderId]);
    if (!o) throw new OrderError("Order not found.");
    if (["cancelled", "returned"].includes(o.status)) throw new OrderError("This order is closed.");
    if (paid) await c.query("update orders set paid = true, paid_at = now(), payment_method = $2 where id = $1", [orderId, method]);
    else await c.query("update orders set paid = false, paid_at = null where id = $1", [orderId]);
    await event(c, orderId, user, paid ? `Payment received (${PAYMENTS[method]})` : "Payment marked as not received");
  });
}

export async function getOrder(id: number): Promise<{ order: Order; items: OrderItem[]; events: { at: Date; text: string; name: string | null }[] } | null> {
  const [order] = await q<Order>("select o.*, u.name as driver_name from orders o left join users u on u.id = o.driver_id where o.id = $1", [id]);
  if (!order) return null;
  const [items, events] = await Promise.all([
    q<OrderItem>("select * from order_items where order_id = $1 order by id", [id]),
    q<{ at: Date; text: string; name: string | null }>("select e.at, e.text, u.name from order_events e left join users u on u.id = e.user_id where e.order_id = $1 order by e.at, e.id", [id]),
  ]);
  return { order, items, events };
}

/** What a driver is allowed to see: orders ready or out with them, and their own deliveries from the last 7 days. */
export const DRIVER_SCOPE = `(
  (o.status = 'confirmed' and (o.driver_id is null or o.driver_id = $1))
  or (o.status = 'out_for_delivery' and (o.driver_id is null or o.driver_id = $1))
  or (o.status = 'delivered' and o.driver_id = $1 and o.delivered_at > now() - interval '7 days')
)`;

/** The number behind the "new orders" pop-up: new orders for admins, orders waiting for delivery for drivers. */
export async function attentionCount(user: User): Promise<number> {
  const [r] = user.role === "admin"
    ? await q<{ n: number }>("select count(*)::int as n from orders where status = 'new'")
    : await q<{ n: number }>("select count(*)::int as n from orders where status = 'confirmed' and (driver_id is null or driver_id = $1)", [user.id]);
  return r.n;
}
