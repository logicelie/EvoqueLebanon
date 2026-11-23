import Link from "next/link";
import { Product, badges, priceRange } from "@/lib/catalog";
import { img } from "@/lib/img";
import { money } from "@/lib/format";
import AddToCart from "./AddToCart";

export default function ProductCard({ p, showButton = false }: { p: Product; showButton?: boolean }) {
  const r = priceRange(p);
  const b = badges(p);
  const off = r.compare ? Math.round((1 - r.min / r.compare) * 100) : 0;
  const first = img(p.images[0]?.src, 600);
  const second = p.images[1] ? img(p.images[1].src, 600) : null;
  const soldOut = p.variants.every((v) => !v.available);
  return (
    <div className="card">
      <Link href={`/products/${p.handle}`} className="card-media">
        <div className="badges">
          {off > 0 && <span className="badge badge-sale">-{off}%</span>}
          {soldOut && <span className="badge">Sold out</span>}
          {b.map((x) => <span key={x} className="badge">{x}</span>)}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {first && <img src={first} alt={p.title} loading="lazy" className="img-a" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {second && <img src={second} alt="" loading="lazy" className="img-b" />}
      </Link>
      <Link href={`/products/${p.handle}`} className="card-title">{p.title}</Link>
      <div className="card-price">
        {r.compare && <s className="muted">{money(r.compare)}</s>}{" "}
        <span className={r.compare ? "sale" : ""}>{r.from ? "From " : ""}{money(r.min)}</span>
      </div>
      {showButton && (
        <AddToCart compact handle={p.handle} title={p.title} image={img(p.images[0]?.src, 200)} variants={p.variants} />
      )}
    </div>
  );
}
