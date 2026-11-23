"use client";
import { useState, useTransition } from "react";
import { saveStockAction } from "@/app/admin/actions";

export type StockItem = { variantId: string; label: string; listPrice: string; qty: number | null; low: number; price: string | null; cost: string | null; hidden: boolean };

export default function StockRow({ item }: { item: StockItem }) {
  const [qty, setQty] = useState(item.qty == null ? "" : String(item.qty));
  const [low, setLow] = useState(String(item.low));
  const [price, setPrice] = useState(item.price ?? "");
  const [cost, setCost] = useState(item.cost ?? "");
  const [saved, setSaved] = useState({ qty, low, price, cost });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = qty !== saved.qty || low !== saved.low || price !== saved.price || cost !== saved.cost;
  const n = saved.qty === "" ? null : Number(saved.qty);
  const state = n == null ? ["", "Not tracked"] : n <= 0 ? ["unpaid", "Sold out"] : n <= Number(saved.low) ? ["confirmed", "Low"] : ["paid", "In stock"];

  function save() {
    start(async () => {
      const r = await saveStockAction({ variantId: item.variantId, qty, low, price, cost });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) setSaved({ qty, low, price, cost });
    });
  }

  return (
    <div className="stockrow">
      <div>
        <div className="name">{item.label}</div>
        <div className="btnrow sm" style={{ marginTop: 4, alignItems: "center" }}>
          <span className={`pill ${state[0]}`}>{state[1]}</span>
          {item.hidden && <span className="pill">Hidden</span>}
          <span className="mut">List price ${item.listPrice}</span>
          {msg && <span role="status" style={{ color: msg.ok ? "var(--ok)" : "var(--bad)", fontWeight: 600 }}>{msg.text}</span>}
        </div>
      </div>
      <div className="ins">
        <label>In stock<input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Not tracked" /></label>
        <label>Alert at<input inputMode="numeric" value={low} onChange={(e) => setLow(e.target.value)} /></label>
        <label>Price $<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={item.listPrice} /></label>
        <label>Cost $<input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Optional" /></label>
        <button className="btn sm" style={{ minHeight: 44 }} disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
