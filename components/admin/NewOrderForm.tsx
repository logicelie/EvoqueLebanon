"use client";
import { useMemo, useState } from "react";
import { AREAS, PAYMENTS, deliveryFee } from "@/lib/shop";
import { Submit } from "./client";

export type Pick = { key: string; handle: string; variant: string; label: string; price: number; left: number | null };
const usd = (n: number) => `$${n.toFixed(2)}`;

export default function NewOrderForm({ picks, action }: { picks: Pick[]; action: (f: FormData) => void }) {
  const [term, setTerm] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fee, setFee] = useState("");
  const found = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t.length < 2 ? [] : picks.filter((p) => p.label.toLowerCase().includes(t)).slice(0, 8);
  }, [term, picks]);
  const lines = Object.entries(cart).map(([key, qty]) => ({ p: picks.find((x) => x.key === key)!, qty }));
  const subtotal = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  const delivery = fee.trim() === "" ? deliveryFee(subtotal) : Number(fee) || 0;
  const set = (key: string, qty: number) => setCart((c) => { const n = { ...c }; if (qty > 0) n[key] = qty; else delete n[key]; return n; });

  return (
    <form className="cols" action={action}>
      <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ handle: l.p.handle, variant: l.p.variant, qty: l.qty })))} />
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Products</h2>
        <label className="f">Find a product<input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Type at least 2 letters" onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} /></label>
        {found.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            {found.map((p) => (
              <button type="button" key={p.key} className="btn ghost" style={{ justifyContent: "space-between", textAlign: "left", height: "auto", padding: "10px 14px" }}
                onClick={() => { set(p.key, (cart[p.key] ?? 0) + 1); setTerm(""); }}>
                <span>{p.label}{p.left != null && <span className="mut"> · {p.left} in stock</span>}</span><span className="num">{usd(p.price)}</span>
              </button>
            ))}
          </div>
        )}
        {lines.length === 0 ? <p className="mut sm" style={{ margin: 0 }}>No products added yet.</p> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th className="right">Total</th></tr></thead>
              <tbody>
                {lines.map(({ p, qty }) => (
                  <tr key={p.key}>
                    <td>{p.label}</td>
                    <td><input aria-label={`Quantity of ${p.label}`} type="number" min={0} max={99} value={qty} onChange={(e) => set(p.key, Math.floor(Number(e.target.value)))} style={{ width: 76 }} /></td>
                    <td className="right num">{usd(p.price * qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="kv">
          <dt>Subtotal</dt><dd className="num">{usd(subtotal)}</dd>
          <dt>Delivery</dt><dd className="num">{usd(delivery)}</dd>
          <dt><strong>Total</strong></dt><dd className="num"><strong>{usd(subtotal + delivery)}</strong></dd>
        </dl>
      </section>
      <section className="card form">
        <h2 style={{ margin: 0 }}>Customer</h2>
        <label className="f">Full name<input name="name" required maxLength={120} /></label>
        <label className="f">Phone<input name="phone" type="tel" required maxLength={40} placeholder="+961" /></label>
        <label className="f">Area<select name="area" required defaultValue=""><option value="" disabled>Select</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className="f">Address<textarea name="address" required maxLength={400} /></label>
        <label className="f">Note<textarea name="notes" maxLength={600} /></label>
        <div className="grid2">
          <label className="f">Payment<select name="payment" defaultValue="cod">{Object.entries(PAYMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f">Delivery fee (USD)<input name="delivery_fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder={`Standard: ${usd(deliveryFee(subtotal))}`} /></label>
        </div>
        <Submit className="btn block">Create order</Submit>
      </section>
    </form>
  );
}
