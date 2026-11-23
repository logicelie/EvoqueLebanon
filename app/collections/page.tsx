import Link from "next/link";
import { allCollections, getCollection } from "@/lib/catalog";
import { img } from "@/lib/img";

export const metadata = { title: "Collections" };

export default function Collections() {
  const cols = allCollections();
  return (
    <div className="container section">
      <h1 className="section-title">Shop by collection</h1>
      <div className="tiles">
        {cols.map((c) => {
          const cover = c.image ?? getCollection(c.handle)?.products[0]?.images[0]?.src;
          return (
            <Link key={c.handle} href={`/collections/${c.handle}`} className="tile" style={{ background: "#f3f3f3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cover && <img src={img(cover, 600)} alt={c.title} loading="lazy" style={{ objectFit: c.image ? "cover" : "contain" }} />}
              <div className="tile-text" style={{ color: c.image ? "#fff" : "var(--ink)", textShadow: c.image ? undefined : "none" }}>
                <strong style={{ fontSize: 22 }}>{c.title}</strong>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
