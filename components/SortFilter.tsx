"use client";
import { usePathname, useRouter } from "next/navigation";

export default function SortFilter({ sort, stock, count }: { sort: string; stock: string; count: number }) {
  const router = useRouter();
  const path = usePathname();
  const go = (k: string, v: string) => {
    const q = new URLSearchParams({ sort, stock, [k]: v });
    for (const [key, val] of [...q.entries()]) if (!val) q.delete(key);
    router.push(`${path}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  return (
    <div className="toolbar">
      <label>Filter by
        <select value={stock} onChange={(e) => go("stock", e.target.value)}>
          <option value="">Availability: all</option>
          <option value="in">In stock only</option>
        </select>
      </label>
      <span className="muted small">{count} products</span>
      <label>Sort by
        <select value={sort} onChange={(e) => go("sort", e.target.value)}>
          <option value="">Featured</option>
          <option value="title-asc">Alphabetically, A–Z</option>
          <option value="title-desc">Alphabetically, Z–A</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
        </select>
      </label>
    </div>
  );
}
