import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { baseProducts } from "@/lib/catalog";
import { Flash } from "@/components/admin/ui";
import NewOrderForm, { Pick } from "@/components/admin/NewOrderForm";
import { manualOrderAction } from "../../../actions";

export const metadata = { title: "New order" };

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("admin");
  const stock = Object.fromEntries((await q<{ variant_id: string; qty: number | null; price: string | null }>("select variant_id, qty, price from stock")).map((r) => [r.variant_id, r]));
  const picks: Pick[] = baseProducts().flatMap((p) =>
    p.variants.map((v) => ({
      key: String(v.id), handle: p.handle, variant: v.title,
      label: v.title === "Default Title" ? p.title : `${p.title} · ${v.title}`,
      price: Number(stock[String(v.id)]?.price ?? v.price), left: stock[String(v.id)]?.qty ?? null,
    })),
  );
  return (
    <>
      <div className="adm-head"><div><Link href="/admin/orders" className="sm mut">← Orders</Link><h1>New order</h1></div></div>
      <p className="mut sm">For orders taken by phone, Instagram or in person. The order starts as confirmed and the items leave stock.</p>
      <Flash sp={await searchParams} />
      <NewOrderForm picks={picks} action={manualOrderAction} />
    </>
  );
}
