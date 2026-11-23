import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allProducts, getProduct, getCollection, badges } from "@/lib/catalog";
import { img } from "@/lib/img";
import AddToCart from "@/components/AddToCart";
import { Gallery } from "@/components/Bits";
import ProductCard from "@/components/ProductCard";

type P = { params: Promise<{ handle: string }> };

export async function generateStaticParams() {
  return (await allProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct((await params).handle);
  if (!p) return {};
  const text = p.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return { title: p.title, description: text, openGraph: { images: p.images[0] ? [img(p.images[0].src, 1200)] : [] } };
}

export default async function ProductPage({ params }: P) {
  const p = await getProduct((await params).handle);
  if (!p) notFound();
  const b = badges(p);
  const related = ((await getCollection("best-sellers"))?.products ?? []).filter((x) => x.handle !== p.handle).slice(0, 4);
  return (
    <div className="container">
      <div className="pdp">
        <div style={{ position: "relative" }}>
          <div className="badges">{b.map((x) => <span key={x} className="badge">{x}</span>)}</div>
          <Gallery images={p.images.map((i) => img(i.src, 1200))} title={p.title} />
        </div>
        <div>
          <p className="small muted"><Link href="/collections/all">All products</Link>{p.product_type ? ` / ${p.product_type}` : ""}</p>
          <h1>{p.title}</h1>
          <AddToCart handle={p.handle} title={p.title} image={img(p.images[0]?.src, 200)} variants={p.variants} optionName={p.options[0]?.name} />
          <div className="perk">🚚 Free delivery across Lebanon on orders $100+</div>
          <div className="perk">💵 Cash on delivery available</div>
          <div className="desc">
            <details open>
              <summary>Description</summary>
              <div className="rte" dangerouslySetInnerHTML={{ __html: p.body_html }} />
            </details>
            <details>
              <summary>Delivery & returns</summary>
              <p className="rte">Delivered in 1–3 business days across Lebanon. Unopened items can be returned within 14 days. <Link className="link" href="/pages/return-policy">Full policy</Link></p>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <h2 className="section-title">You may also like</h2>
          <div className="grid">{related.map((r) => <ProductCard key={r.handle} p={r} showButton />)}</div>
        </section>
      )}
    </div>
  );
}
