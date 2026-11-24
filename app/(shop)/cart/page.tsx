"use client";
import { useState } from "react";
import Link from "next/link";
import site from "@/data/site.json";
import { CartLines, useCart, money } from "@/components/Cart";
import { AREAS, FREE_OVER, PAYMENTS, Payment, deliveryFee } from "@/lib/shop";

type Done = { number: string | null; whatsapp: string; payment: Payment; total: number };

export default function CartPage() {
  const { items, subtotal, clear } = useCart();
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const delivery = deliveryFee(items.length ? subtotal : 0);

  /**
   * Saves the order in the portal (stock goes down, staff see it straight away). If the portal database is not
   * connected the order is only sent on WhatsApp, as before.
   */
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const payment = (f.payment || "cod") as Payment;
    setBusy(true); setError("");
    let number: string | null = null;
    let lines = items.map((i) => ({ title: i.title, variant: i.variant, qty: i.qty, price: i.price }));
    let totals = { subtotal, delivery, total: subtotal + delivery };
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, payment, items: items.map((i) => ({ handle: i.handle, variant: i.variant, qty: i.qty })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { number = data.number; lines = data.lines; totals = data; }
      else if (res.status !== 503) { setError(data.error || "We could not save your order. Please try again."); setBusy(false); return; }
    } catch {
      setError("No connection. Please check your internet and try again."); setBusy(false); return;
    }
    const msg = [
      number ? `Order ${number} — ${site.name}` : `New order — ${site.name}`, "",
      ...lines.map((l) => `• ${l.qty} × ${l.title}${l.variant !== "Default Title" ? ` (${l.variant})` : ""} — ${money(l.price * l.qty)}`), "",
      `Subtotal: ${money(totals.subtotal)}`, `Delivery: ${totals.delivery ? money(totals.delivery) : "Free"}`, `Total: ${money(totals.total)}`, "",
      `Name: ${f.name}`, `Phone: ${f.phone}`, `Area: ${f.area}`, `Address: ${f.address}`,
      ...(f.notes ? [`Notes: ${f.notes}`] : []), `Payment: ${PAYMENTS[payment]}`,
    ].join("\n");
    setDone({ number, payment, total: totals.total, whatsapp: `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(msg)}` });
    clear();
    setBusy(false);
    window.scrollTo(0, 0);
  }

  if (done) {
    return (
      <div className="page center">
        <h1>{done.number ? "Thank you!" : "One last step"}</h1>
        {done.number ? (
          <>
            <p>Your order <strong>{done.number}</strong> is confirmed for {money(done.total)}. We’ll contact you to arrange delivery.</p>
            {done.payment !== "cod" && <p>To pay by {PAYMENTS[done.payment]}, send {money(done.total)} to <strong>{site.contact.phone}</strong> and share the receipt with us on WhatsApp, mentioning order {done.number}.</p>}
            <p><a href={done.whatsapp} target="_blank" rel="noreferrer" className="btn btn-dark">Message us on WhatsApp</a></p>
          </>
        ) : (
          <>
            <p>Send your order to us on WhatsApp to complete it.</p>
            <p><a href={done.whatsapp} target="_blank" rel="noreferrer" className="btn btn-dark">Send order on WhatsApp</a></p>
          </>
        )}
        <Link href="/collections/all" className="btn btn-outline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <div>
        <h1>Your cart</h1>
        <CartLines />
        {!items.length && <p><Link href="/collections/all" className="btn btn-dark">Shop all products</Link></p>}
      </div>
      {items.length > 0 && (
        <form className="panel" onSubmit={submit}>
          <h3>Checkout</h3>
          <div className="row-between small"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row-between small"><span>Delivery</span><span>{delivery ? money(delivery) : "Free"}</span></div>
          <div className="row-between" style={{ margin: "10px 0 18px" }}><strong>Total</strong><strong>{money(subtotal + delivery)}</strong></div>
          {delivery > 0 && <p className="small muted">Add {money(FREE_OVER - subtotal)} more for free delivery.</p>}
          <label className="field">Full name<input name="name" required autoComplete="name" maxLength={120} /></label>
          <label className="field">Phone (WhatsApp)<input name="phone" required type="tel" autoComplete="tel" placeholder="+961" maxLength={40} /></label>
          <label className="field">Area
            <select name="area" required defaultValue="">
              <option value="" disabled>Select</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">Address<textarea name="address" required rows={2} maxLength={400} /></label>
          <label className="field">Notes (optional)<textarea name="notes" rows={2} maxLength={600} /></label>
          <label className="field">Payment
            <select name="payment" defaultValue="cod">
              {Object.entries(PAYMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
          {error && <p className="small" role="alert" style={{ color: "#b42318", fontWeight: 600 }}>{error}</p>}
          <button className="btn btn-dark btn-block" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
        </form>
      )}
    </div>
  );
}
