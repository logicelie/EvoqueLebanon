import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allCollections, getCollection, priceRange, Product } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import SortFilter from "@/components/SortFilter";

type P = { params: Promise<{ handle: string }>; searchParams: Promise<{ sort?: string; stock?: string }> };

export function generateStaticParams() {
  return [{ handle: "all" }, ...allCollections().map((c) => ({ handle: c.handle }))];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = getCollection((await params).handle);
  return c ? { title: c.collection.title } : {};
}

const sorters: Record<string, (a: Product, b: Product) => number> = {
  "price-asc": (a, b) => priceRange(a).min - priceRange(b).min,
  "price-desc": (a, b) => priceRange(b).min - priceRange(a).min,
  "title-asc": (a, b) => a.title.localeCompare(b.title),
  "title-desc": (a, b) => b.title.localeCompare(a.title),
};

export default async function CollectionPage({ params, searchParams }: P) {
  const data = getCollection((await params).handle);
  if (!data) notFound();
  const { sort, stock } = await searchParams;
  let list = [...data.products];
  if (stock === "in") list = list.filter((p) => p.variants.some((v) => v.available));
  if (sort && sorters[sort]) list.sort(sorters[sort]);
  const desc = data.collection.description;
  return (
    <>
      <section className="coll-hero">
        <div className="container">
          <h1>{data.collection.title}</h1>
          {desc && <div className="rte" dangerouslySetInnerHTML={{ __html: desc }} />}
        </div>
      </section>
      <div className="container">
        <SortFilter sort={sort ?? ""} stock={stock ?? ""} count={list.length} />
        {list.length ? (
          <div className="grid grid-5">{list.map((p) => <ProductCard key={p.handle} p={p} showButton />)}</div>
        ) : (
          <p className="center muted section">No products found.</p>
        )}
      </div>
    </>
  );
}
