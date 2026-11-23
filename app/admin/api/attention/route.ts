import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { attentionCount } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ count: await attentionCount(user) });
}
