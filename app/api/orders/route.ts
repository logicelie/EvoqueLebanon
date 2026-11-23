import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { hasDb, q } from "@/lib/db";
import { OrderError, createOrder } from "@/lib/orders";

export const runtime = "nodejs";

/** Storefront checkout. Saves the order, takes the items out of stock and returns the order number. */
export async function POST(req: Request) {
  // 503 tells the cart page to fall back to WhatsApp-only ordering.
  if (!hasDb) return NextResponse.json({ error: "Orders are taken on WhatsApp for now." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  if (body.company) return NextResponse.json({ number: "EV-0000", total: 0 }); // honeypot: bots fill hidden fields

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = crypto.createHash("sha256").update(`evq:${ip}`).digest("hex").slice(0, 32);
  try {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from orders where ip_hash = $1 and created_at > now() - interval '1 hour'", [ipHash]);
    if (n >= 6) return NextResponse.json({ error: "Too many orders from this connection. Please message us on WhatsApp." }, { status: 429 });
    const o = await createOrder({
      items: body.items as never, name: body.name as string, phone: body.phone as string, area: body.area as string,
      address: body.address as string, notes: body.notes as string, payment: (body.payment ?? "cod") as never, source: "web", ipHash,
    });
    revalidateTag("catalog");
    return NextResponse.json({ number: o.number, subtotal: o.subtotal, delivery: o.delivery, total: o.total, lines: o.lines });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("order failed", e);
    return NextResponse.json({ error: "We could not save your order. Please try again or message us on WhatsApp." }, { status: 500 });
  }
}
