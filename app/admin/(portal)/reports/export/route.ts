import { currentUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { PAYMENTS, STATUSES } from "@/lib/shop";

export const dynamic = "force-dynamic";
const isDate = (d: string | null): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
/** Quotes a CSV cell and stops spreadsheet apps from running customer text as a formula. */
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return new Response("Not allowed", { status: 403 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  if (!isDate(from) || !isDate(to)) return new Response("Bad dates", { status: 400 });
  const rows = await q<Record<string, string | number | boolean | null>>(
    `select o.number, to_char(o.created_at at time zone 'Asia/Beirut', 'YYYY-MM-DD HH24:MI') as placed, o.status, o.source, o.customer_name, o.phone, o.area, o.address,
            (select string_agg(i.qty || ' x ' || i.title || case when i.variant_title <> 'Default Title' then ' (' || i.variant_title || ')' else '' end, '; ' order by i.id) from order_items i where i.order_id = o.id) as items,
            o.subtotal, o.delivery_fee, o.total, o.payment_method, o.paid,
            to_char(o.paid_at at time zone 'Asia/Beirut', 'YYYY-MM-DD HH24:MI') as paid_at,
            to_char(o.delivered_at at time zone 'Asia/Beirut', 'YYYY-MM-DD HH24:MI') as delivered_at,
            o.delivery_cost, u.name as driver, o.notes
     from orders o left join users u on u.id = o.driver_id
     where (o.created_at at time zone 'Asia/Beirut')::date between $1 and $2 order by o.created_at`, [from, to]);
  const head = ["Order", "Placed", "Status", "Source", "Customer", "Phone", "Area", "Address", "Items", "Subtotal", "Delivery charged", "Total", "Payment", "Paid", "Paid at", "Delivered at", "Delivery cost", "Driver", "Customer note"];
  const lines = rows.map((r) => [
    r.number, r.placed, STATUSES[r.status as keyof typeof STATUSES], r.source === "web" ? "Website" : "Staff", r.customer_name, r.phone, r.area, r.address, r.items,
    r.subtotal, r.delivery_fee, r.total, PAYMENTS[r.payment_method as keyof typeof PAYMENTS], r.paid ? "Yes" : "No", r.paid_at, r.delivered_at, r.delivery_cost, r.driver, r.notes,
  ].map(cell).join(","));
  return new Response("﻿" + [head.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="evoque-orders-${from}-to-${to}.csv"` },
  });
}
