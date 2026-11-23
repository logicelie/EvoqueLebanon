import { search } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const results = await search(q);
  return (
    <div className="container section">
      <h1 className="section-title">Search</h1>
      <form style={{ maxWidth: 520, margin: "0 auto 40px", display: "flex", gap: 8 }}>
        <input name="q" defaultValue={q} placeholder="Search products" className="field" style={{ flex: 1, padding: "12px 14px", border: "1px solid #ccc", font: "inherit", margin: 0 }} />
        <button className="btn btn-dark">Search</button>
      </form>
      {q && <p className="center muted">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>}
      <div className="grid">{results.map((p) => <ProductCard key={p.handle} p={p} showButton />)}</div>
    </div>
  );
}
