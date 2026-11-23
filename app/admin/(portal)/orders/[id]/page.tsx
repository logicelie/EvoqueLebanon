import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { DRIVER_SCOPE, getOrder, nextStatuses } from "@/lib/orders";
import { AREAS, PAYMENTS } from "@/lib/shop";
import { money } from "@/lib/format";
import { Flash, Icon, PaidPill, StatusPill, fmtDateTime } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";
import { orderUpdateAction, paidAction, statusAction } from "../../../actions";

export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const admin = user.role === "admin";
  if (!admin) {
    const [mine] = await q(`select 1 from orders o where o.id = $2 and ${DRIVER_SCOPE}`, [user.id, id]);
    if (!mine) notFound();
  }
  const data = await getOrder(id);
  if (!data) notFound();
  const { order: o, items, events } = data;
  const next = nextStatuses(o, user);
  const drivers = admin ? await q<{ id: number; name: string }>("select id, name from users where role = 'driver' and active order by name") : [];
  const phone = o.phone.replace(/[^\d+]/g, "");
  const wa = phone.replace(/\D/g, "").replace(/^0(?=\d{7,8}$)/, "961").replace(/^(?=\d{7,8}$)/, "961");
  const hidden = <input type="hidden" name="id" value={o.id} />;

  return (
    <>
      <div className="adm-head">
        <div>
          <Link href="/admin/orders" className="sm mut">← Orders</Link>
          <h1>{o.number}</h1>
          <div className="btnrow" style={{ marginTop: 8 }}><StatusPill s={o.status} /><PaidPill paid={o.paid} method={o.payment_method} /></div>
        </div>
        <div className="right">
          <div className="mut sm">{o.paid ? "Total (paid)" : "To collect"}</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{money(o.total)}</div>
        </div>
      </div>
      <Flash sp={await searchParams} />

      <div className="cols">
        <div className="stack">
          <section className="card">
            <h2>Customer</h2>
            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{o.customer_name}</p>
            <p style={{ margin: "0 0 12px" }}>{o.area} · {o.address}</p>
            {o.notes && <p className="note warn" style={{ fontWeight: 500 }}>Customer note: {o.notes}</p>}
            <div className="btnrow">
              <a className="btn ghost" href={`tel:${phone}`}><Icon name="phone" size={18} />{o.phone}</a>
              <a className="btn ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, ${o.area}, Lebanon`)}`} target="_blank" rel="noreferrer"><Icon name="pin" size={18} />Map</a>
            </div>
          </section>

          <section className="card">
            <h2>Items</h2>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Price</th><th className="right">Total</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.title}{i.variant_title !== "Default Title" && <span className="mut"> · {i.variant_title}</span>}</td>
                      <td className="right num">{i.qty}</td>
                      <td className="right num">{money(i.price)}</td>
                      <td className="right num">{money(Number(i.price) * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Subtotal</dt><dd className="num">{money(o.subtotal)}</dd>
              <dt>Delivery charged</dt><dd className="num">{Number(o.delivery_fee) ? money(o.delivery_fee) : "Free"}</dd>
              <dt><strong>Total</strong></dt><dd className="num"><strong>{money(o.total)}</strong></dd>
            </dl>
          </section>

          {admin && (
            <section className="card">
              <h2>Edit details</h2>
              <form className="form" action={orderUpdateAction}>
                {hidden}
                <div className="grid2">
                  <label className="f">Name<input name="customer_name" defaultValue={o.customer_name} required /></label>
                  <label className="f">Phone<input name="phone" defaultValue={o.phone} required /></label>
                </div>
                <label className="f">Area<select name="area" defaultValue={o.area}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
                <label className="f">Address<textarea name="address" defaultValue={o.address} required /></label>
                <label className="f">Customer note<textarea name="notes" defaultValue={o.notes} /></label>
                <label className="f">Internal note (staff only)<textarea name="internal_note" defaultValue={o.internal_note} /></label>
                <div className="grid2">
                  <label className="f">Driver
                    <select name="driver_id" defaultValue={o.driver_id ?? ""}>
                      <option value="">Any driver</option>
                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                  <label className="f">Delivery cost you pay (USD)<input name="delivery_cost" inputMode="decimal" defaultValue={o.delivery_cost ?? ""} placeholder="Filled in on delivery" /></label>
                </div>
                <div><Submit className="btn ghost">Save details</Submit></div>
              </form>
            </section>
          )}
        </div>

        <div className="stack">
          {next.length > 0 && (
            <section className="card stack">
              <h2 style={{ margin: 0 }}>Next step</h2>
              {next.includes("confirmed") && o.status === "new" && (
                <form action={statusAction}>{hidden}<input type="hidden" name="to" value="confirmed" /><Submit className="btn block">Confirm order</Submit></form>
              )}
              {next.includes("out_for_delivery") && (
                <form action={statusAction}>{hidden}<input type="hidden" name="to" value="out_for_delivery" /><Submit className="btn block">{admin ? "Mark out for delivery" : "I’m delivering this order"}</Submit></form>
              )}
              {next.includes("delivered") && (
                <form className="form" action={statusAction}>
                  {hidden}<input type="hidden" name="to" value="delivered" />
                  {!o.paid && (
                    <label className="f">Payment received
                      <select name="paidVia" defaultValue={o.payment_method}>
                        <option value="cod">Cash, {money(o.total)}</option>
                        <option value="whish">Whish Money</option>
                        <option value="omt">OMT</option>
                        <option value="unpaid">Not paid yet</option>
                      </select>
                    </label>
                  )}
                  <Submit className="btn ok block">Mark delivered</Submit>
                </form>
              )}
              {next.includes("confirmed") && o.status === "out_for_delivery" && (
                <form className="form" action={statusAction}>
                  {hidden}<input type="hidden" name="to" value="confirmed" />
                  <label className="f">Could not deliver? Say why<input name="note" required placeholder="No answer, wrong address…" /></label>
                  <Submit className="btn ghost block">Send back to the office</Submit>
                </form>
              )}
              {next.includes("cancelled") && (
                <form action={statusAction}>{hidden}<input type="hidden" name="to" value="cancelled" /><Submit className="btn danger block" confirm="Cancel this order? The items go back into stock.">Cancel order</Submit></form>
              )}
              {next.includes("returned") && (
                <form action={statusAction}>{hidden}<input type="hidden" name="to" value="returned" /><Submit className="btn danger block" confirm="Mark as returned? The items go back into stock and the payment is marked refunded.">Mark returned</Submit></form>
              )}
            </section>
          )}

          {admin && !["cancelled", "returned"].includes(o.status) && (
            <section className="card">
              <h2>Payment</h2>
              <form className="form" action={paidAction}>
                {hidden}<input type="hidden" name="paid" value={o.paid ? "0" : "1"} />
                {o.paid ? (
                  <>
                    <input type="hidden" name="method" value={o.payment_method} />
                    <p className="sm" style={{ margin: 0 }}>{money(o.total)} received by {PAYMENTS[o.payment_method]}{o.paid_at ? ` on ${fmtDateTime(o.paid_at)}` : ""}.</p>
                    <Submit className="btn ghost" confirm="Mark this order as not paid?">Mark as not paid</Submit>
                  </>
                ) : (
                  <>
                    <label className="f">Received by<select name="method" defaultValue={o.payment_method}>{Object.entries(PAYMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                    <Submit className="btn ghost">Mark {money(o.total)} as received</Submit>
                  </>
                )}
              </form>
            </section>
          )}

          <section className="card">
            <h2>Details</h2>
            <dl className="kv">
              <dt>Placed</dt><dd>{fmtDateTime(o.created_at)}</dd>
              <dt>Source</dt><dd>{o.source === "web" ? "Website" : "Entered by staff"}</dd>
              <dt>Driver</dt><dd>{o.driver_name ?? "Not assigned"}</dd>
              {o.delivered_at && (<><dt>Delivered</dt><dd>{fmtDateTime(o.delivered_at)}</dd></>)}
              {admin && o.delivery_cost != null && (<><dt>Delivery cost</dt><dd className="num">{money(o.delivery_cost)}</dd></>)}
            </dl>
            {admin && o.internal_note && <p className="sm" style={{ marginBottom: 0 }}>Internal note: {o.internal_note}</p>}
          </section>

          <section className="card">
            <h2>History</h2>
            <ol className="timeline">
              {events.map((e, i) => (
                <li key={i}><div>{e.text}</div><div className="mut">{fmtDateTime(e.at)}{e.name ? ` · ${e.name}` : ""}</div></li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
