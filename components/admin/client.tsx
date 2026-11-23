"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the form's server action runs. */
export function Submit({ children, className = "btn", confirm }: { children: React.ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : path.startsWith(href);
  return <Link href={href} aria-current={on ? "page" : undefined}>{children}</Link>;
}

/**
 * Pop-up shown when staff open the portal and there are orders waiting, and again whenever the number goes up
 * while the portal is open (checked every 45 seconds).
 */
export function NewOrdersPopup({ initial, href, label }: { initial: number; href: string; label: string }) {
  const [count, setCount] = useState(initial);
  const [open, setOpen] = useState(false);
  const seen = useRef(0);
  const btn = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try { seen.current = Number(sessionStorage.getItem("evq-seen-orders") ?? 0); } catch {}
    if (initial > seen.current) setOpen(true);
    const t = setInterval(async () => {
      try {
        const r = await fetch("/admin/api/attention", { cache: "no-store" });
        if (!r.ok) return;
        const { count: n } = await r.json();
        setCount(n);
        if (n > seen.current) setOpen(true);
        if (n < seen.current) remember(n);
      } catch {}
    }, 45000);
    return () => clearInterval(t);
  }, [initial]);
  useEffect(() => { if (open) btn.current?.focus(); }, [open]);

  function remember(n: number) { seen.current = n; try { sessionStorage.setItem("evq-seen-orders", String(n)); } catch {} }
  function close() { remember(count); setOpen(false); }

  if (!open || count < 1) return null;
  return (
    <div className="adm-dialog-back" role="dialog" aria-modal="true" aria-labelledby="evq-new-orders" onKeyDown={(e) => e.key === "Escape" && close()}>
      <div className="adm-dialog">
        <div className="big num">{count}</div>
        <h2 id="evq-new-orders" style={{ margin: 0 }}>{count === 1 ? label.replace("orders", "order") : label}</h2>
        <Link ref={btn} href={href} className="btn block" onClick={close}>View {count === 1 ? "it" : "them"}</Link>
        <button className="btn ghost block" onClick={close}>Later</button>
      </div>
    </div>
  );
}
