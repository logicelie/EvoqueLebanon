"use client";
import { useState } from "react";
import Link from "next/link";
import site from "@/data/site.json";
import { CartLines, useCart, money } from "@/components/Cart";

const FREE_OVER = 100;
const DELIVERY_FEE = 4;

export default function CartPage() {
  const { items, subtotal, clear } = useCart();
  const [sent, setSent] = useState(false);
  const delivery = subtotal >= FREE_OVER || !items.length ? 0 : DELIVERY_FEE;

  /** Orders go to the store's WhatsApp as a pre-filled message (cash on delivery). Swap for a payment gateway later. */
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const lines = items.map((i) => `• ${i.qty} × ${i.title}${i.variant !== "Default Title" ? ` (${i.variant})` : ""} — ${money(i.price * i.qty)}`);
    const msg = [
      `New order — ${site.name}`, "", ...lines, "",
      `Subtotal: ${money(subtotal)}`, `Delivery: ${delivery ? money(delivery) : "Free"}`, `Total: ${money(subtotal + delivery)}`, "",
      `Name: ${f.get("name")}`, `Phone: ${f.get("phone")}`, `Area: ${f.get("area")}`, `Address: ${f.get("address")}`,
      f.get("notes") ? `Notes: ${f.get("notes")}` : "", "Payment: Cash on delivery",
    ].filter((l) => l !== null).join("\n");
    window.open(`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
    clear();
  }

  if (sent) {
    return (
      <div className="page center">
        <h1>Thank you!</h1>
        <p>Your order was sent to us on WhatsApp. We’ll confirm delivery shortly.</p>
        <Link href="/collections/all" className="btn btn-dark">Continue shopping</Link>
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
          <label className="field">Full name<input name="name" required autoComplete="name" /></label>
          <label className="field">Phone (WhatsApp)<input name="phone" required type="tel" autoComplete="tel" placeholder="+961" /></label>
          <label className="field">Area
            <select name="area" required defaultValue="">
              <option value="" disabled>Select</option>
              {["Beirut", "Mount Lebanon", "North", "Akkar", "Beqaa", "Baalbek-Hermel", "South", "Nabatieh"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">Address<textarea name="address" required rows={2} /></label>
          <label className="field">Notes (optional)<textarea name="notes" rows={2} /></label>
          <button className="btn btn-dark btn-block">Place order — cash on delivery</button>
        </form>
      )}
    </div>
  );
}
