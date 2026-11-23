"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, money } from "./Cart";

type V = { id: number; title: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null };

export default function AddToCart({
  handle, title, image, variants, optionName, compact = false,
}: { handle: string; title: string; image: string; variants: V[]; optionName?: string; compact?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const [vi, setVi] = useState(Math.max(0, variants.findIndex((v) => v.available)));
  const [qty, setQty] = useState(1);
  const v = variants[vi];
  const hasOptions = !(variants.length === 1 && v.title === "Default Title");
  const item = { handle, title, variant: v.title, price: Number(v.price), image };

  if (compact) {
    return hasOptions ? (
      <a className="btn btn-dark btn-sm btn-block" href={`/products/${handle}`}>View options</a>
    ) : (
      <button className="btn btn-dark btn-sm btn-block" disabled={!v.available} onClick={() => add(item)}>
        {v.available ? "Add to cart" : "Sold out"}
      </button>
    );
  }

  return (
    <div className="atc">
      <div className="price-row">
        <span className={v.compare_at_price ? "price sale" : "price"}>{money(Number(v.price))}</span>
        {v.compare_at_price && Number(v.compare_at_price) > Number(v.price) && (
          <s className="muted">{money(Number(v.compare_at_price))}</s>
        )}
      </div>
      {hasOptions && (
        <div className="opt">
          <div className="label">{optionName ?? "Option"}</div>
          <div className="pills">
            {variants.map((x, i) => (
              <button key={x.id} className={`pill ${i === vi ? "on" : ""}`} disabled={!x.available} onClick={() => setVi(i)}>
                {x.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="stock"><span className={`dot ${v.available ? "ok" : ""}`} />{v.available ? "Ready to ship" : "Sold out"}</div>
      <div className="qty qty-lg">
        <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
        <span>{qty}</span>
        <button onClick={() => setQty(qty + 1)} aria-label="Increase">+</button>
      </div>
      <button className="btn btn-dark btn-block" disabled={!v.available} onClick={() => add(item, qty)}>Add to cart</button>
      <button className="btn btn-outline btn-block" disabled={!v.available} onClick={() => { add(item, qty); router.push("/cart"); }}>
        Buy it now
      </button>
    </div>
  );
}
