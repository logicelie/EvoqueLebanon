"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import site from "@/data/site.json";

export type CartItem = {
  key: string; handle: string; title: string; variant: string; price: number; image: string; qty: number;
};
type Ctx = {
  items: CartItem[]; count: number; subtotal: number; open: boolean;
  setOpen: (o: boolean) => void; add: (i: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void; clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
const STORE = "evoque-lb-cart";

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: site.currency }).format(n);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem(STORE); if (s) setItems(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch {}
  }, [items]);
  const add: Ctx["add"] = (i, qty = 1) => {
    const key = `${i.handle}::${i.variant}`;
    setItems((cur) => {
      const ex = cur.find((c) => c.key === key);
      return ex ? cur.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c)) : [...cur, { ...i, key, qty }];
    });
    setOpen(true);
  };
  const setQty = (key: string, qty: number) =>
    setItems((cur) => (qty <= 0 ? cur.filter((c) => c.key !== key) : cur.map((c) => (c.key === key ? { ...c, qty } : c))));
  const count = items.reduce((a, b) => a + b.qty, 0);
  const subtotal = items.reduce((a, b) => a + b.qty * b.price, 0);
  return (
    <CartCtx.Provider value={{ items, count, subtotal, open, setOpen, add, setQty, clear: () => setItems([]) }}>
      {children}
      <CartDrawer />
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button className="icon-btn" aria-label={`Cart, ${count} items`} onClick={() => setOpen(true)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
      {count > 0 && <span className="cart-count">{count}</span>}
    </button>
  );
}

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { items, setQty } = useCart();
  if (!items.length) return <p className="muted">Your cart is currently empty.</p>;
  return (
    <ul className="cart-lines">
      {items.map((i) => (
        <li key={i.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.image} alt="" width={compact ? 72 : 96} height={compact ? 72 : 96} />
          <div>
            <Link href={`/products/${i.handle}`} className="cart-title">{i.title}</Link>
            {i.variant !== "Default Title" && <div className="muted small">{i.variant}</div>}
            <div className="small">{money(i.price)}</div>
            <div className="qty">
              <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease">−</button>
              <span>{i.qty}</span>
              <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase">+</button>
              <button className="link small" onClick={() => setQty(i.key, 0)}>Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CartDrawer() {
  const { open, setOpen, subtotal, items } = useCart();
  return (
    <>
      <div className={`overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h3>Cart</h3>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body"><CartLines compact /></div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="row-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <p className="muted small">Delivery calculated at checkout. Free delivery across Lebanon over $100.</p>
            <Link href="/cart" className="btn btn-dark btn-block" onClick={() => setOpen(false)}>Check out</Link>
          </div>
        )}
      </aside>
    </>
  );
}
