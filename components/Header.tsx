"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CartButton } from "./Cart";

type NavItem = { label: string; href?: string; children?: { label: string; href: string }[] };

export function Announcement({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);
  return <div className="announcement"><span key={i} className="fade">{messages[i]}</span></div>;
}

export default function Header({ logo, name, nav }: { logo: string; name: string; nav: NavItem[] }) {
  const [menu, setMenu] = useState(false);
  return (
    <header className="header">
      <div className="container header-top">
        <div className="header-left">
          <button className="icon-btn mobile-only" aria-label="Menu" onClick={() => setMenu(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <span className="desktop-only small caps">Lebanon · English</span>
        </div>
        <Link href="/" className="logo" aria-label={name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={name} width={165} height={42} />
          <span className="logo-sub">LEBANON</span>
        </Link>
        <div className="header-right">
          <Link href="/search" className="icon-btn" aria-label="Search">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <CartButton />
        </div>
      </div>
      <nav className="container nav desktop-only">
        {nav.map((n) => (
          <div key={n.label} className="nav-item">
            {n.href ? <Link href={n.href}>{n.label}</Link> : <span>{n.label}</span>}
            {n.children && (
              <div className="dropdown">
                {n.children.map((c) => <Link key={c.href} href={c.href}>{c.label}</Link>)}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className={`overlay ${menu ? "show" : ""}`} onClick={() => setMenu(false)} />
      <aside className={`drawer drawer-left ${menu ? "open" : ""}`}>
        <div className="drawer-head">
          <strong>Menu</strong>
          <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body mobile-nav" onClick={(e) => (e.target as HTMLElement).tagName === "A" && setMenu(false)}>
          {nav.map((n) =>
            n.children ? (
              <details key={n.label}>
                <summary>{n.label}</summary>
                {n.href && <Link href={n.href}>View all</Link>}
                {n.children.map((c) => <Link key={c.href} href={c.href}>{c.label}</Link>)}
              </details>
            ) : (
              <Link key={n.label} href={n.href!}>{n.label}</Link>
            )
          )}
        </div>
      </aside>
    </header>
  );
}
