"use server";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { hashPassword, login, logout, requireUser, verifyPassword } from "@/lib/auth";
import { hasDb, q, tx } from "@/lib/db";
import { OrderError, changeStatus, createOrder, setPaid } from "@/lib/orders";
import { baseProducts } from "@/lib/catalog";
import { AREAS, PAYMENTS, Payment, STATUSES, Status } from "@/lib/shop";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function back(path: string, kind: "error" | "ok", msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}
/** "" -> null, otherwise a non-negative number or undefined when invalid. */
function num(v: string, int = false): number | null | undefined {
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e6 || (int && !Number.isInteger(n))) return undefined;
  return n;
}

export async function loginAction(f: FormData) {
  if (!hasDb) back("/admin/login", "error", "The portal database is not connected yet.");
  const err = await login(s(f, "username"), String(f.get("password") ?? ""));
  if (err) back("/admin/login", "error", err);
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function statusAction(f: FormData) {
  const user = await requireUser();
  const id = Number(s(f, "id")), to = s(f, "to") as Status, path = `/admin/orders/${id}`;
  if (!(to in STATUSES)) back(path, "error", "Unknown status.");
  try {
    await changeStatus(id, to, user, { note: s(f, "note"), paidVia: (s(f, "paidVia") || undefined) as Payment | "unpaid" | undefined });
  } catch (e) {
    if (e instanceof OrderError) back(path, "error", e.message);
    throw e;
  }
  if (to === "cancelled" || to === "returned") revalidateTag("catalog");
  // A driver loses sight of an order once it is no longer theirs to deliver.
  if (user.role === "driver" && to === "confirmed") back("/admin/orders", "ok", "Order sent back to the office.");
  back(path, "ok", `Order marked ${STATUSES[to].toLowerCase()}.`);
}

export async function paidAction(f: FormData) {
  const user = await requireUser("admin");
  const id = Number(s(f, "id")), path = `/admin/orders/${id}`, method = s(f, "method") as Payment;
  if (!(method in PAYMENTS)) back(path, "error", "Choose how it was paid.");
  try { await setPaid(id, s(f, "paid") === "1", method, user); } catch (e) { if (e instanceof OrderError) back(path, "error", e.message); throw e; }
  back(path, "ok", "Payment updated.");
}

export async function orderUpdateAction(f: FormData) {
  const user = await requireUser("admin");
  const id = Number(s(f, "id")), path = `/admin/orders/${id}`;
  const cost = num(s(f, "delivery_cost"));
  const area = AREAS.find((a) => a === s(f, "area"));
  if (cost === undefined) back(path, "error", "Delivery cost must be a number.");
  if (!s(f, "customer_name") || !s(f, "phone") || !s(f, "address") || !area) back(path, "error", "Name, phone, area and address are required.");
  const driver = s(f, "driver_id") ? Number(s(f, "driver_id")) : null;
  await tx(async (c) => {
    await c.query(
      "update orders set customer_name=$2, phone=$3, area=$4, address=$5, notes=$6, internal_note=$7, delivery_cost=$8, driver_id=$9 where id=$1",
      [id, s(f, "customer_name").slice(0, 120), s(f, "phone").slice(0, 40), area, s(f, "address").slice(0, 400), s(f, "notes").slice(0, 600), s(f, "internal_note").slice(0, 600), cost, driver],
    );
    await c.query("insert into order_events (order_id, user_id, text) values ($1, $2, 'Order details edited')", [id, user.id]);
  });
  back(path, "ok", "Order saved.");
}

export async function manualOrderAction(f: FormData) {
  const user = await requireUser("admin");
  let items: { handle: string; variant: string; qty: number }[] = [];
  try { items = JSON.parse(s(f, "items")); } catch {}
  const fee = num(s(f, "delivery_fee"));
  if (fee === undefined) back("/admin/orders/new", "error", "Delivery fee must be a number.");
  let id = 0;
  try {
    const o = await createOrder({
      items, name: s(f, "name"), phone: s(f, "phone"), area: s(f, "area"), address: s(f, "address"), notes: s(f, "notes"),
      payment: s(f, "payment") as Payment, source: "manual", user, deliveryFee: fee ?? undefined,
    });
    id = o.id;
  } catch (e) {
    if (e instanceof OrderError) back("/admin/orders/new", "error", e.message.replace("Your cart is empty.", "Add at least one product."));
    throw e;
  }
  revalidateTag("catalog");
  back(`/admin/orders/${id}`, "ok", "Order created.");
}

/** Called from the stock row on the Products page. Empty quantity means "not tracked". */
export async function saveStockAction(input: { variantId: string; qty: string; low: string; price: string; cost: string }): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser("admin");
  const variant = baseProducts().flatMap((p) => p.variants.map((v) => ({ v, p }))).find((x) => String(x.v.id) === input.variantId);
  if (!variant) return { ok: false, message: "Product not found." };
  const qty = num(input.qty.trim(), true), low = num(input.low.trim(), true), price = num(input.price.trim()), cost = num(input.cost.trim());
  if (qty === undefined || low === undefined) return { ok: false, message: "Quantities must be whole numbers." };
  if (price === undefined || cost === undefined || price === 0) return { ok: false, message: "Prices must be numbers above zero." };
  await tx(async (c) => {
    const { rows: [old] } = await c.query("select qty from stock where variant_id = $1 for update", [input.variantId]);
    await c.query(
      `insert into stock (variant_id, handle, qty, low_alert, price, cost) values ($1,$2,$3,$4,$5,$6)
       on conflict (variant_id) do update set qty = excluded.qty, low_alert = excluded.low_alert, price = excluded.price, cost = excluded.cost`,
      [input.variantId, variant.p.handle, qty, low ?? 3, price, cost],
    );
    const before = old?.qty ?? null;
    if (before !== qty) {
      await c.query("insert into stock_moves (variant_id, user_id, delta, qty_after, reason) values ($1,$2,$3,$4,$5)", [
        input.variantId, user.id, qty != null && before != null ? qty - before : null, qty,
        qty == null ? "Stock tracking turned off" : before == null ? "Stock count entered" : "Stock corrected by hand",
      ]);
    }
  });
  revalidateTag("catalog");
  return { ok: true, message: "Saved" };
}

export async function hideProductAction(f: FormData) {
  await requireUser("admin");
  const handle = s(f, "handle"), hidden = s(f, "hidden") === "1";
  if (!baseProducts().some((p) => p.handle === handle)) back("/admin/products", "error", "Product not found.");
  await q("insert into product_settings (handle, hidden) values ($1, $2) on conflict (handle) do update set hidden = excluded.hidden", [handle, hidden]);
  revalidateTag("catalog");
  back(s(f, "back").startsWith("/admin/products") ? s(f, "back") : "/admin/products", "ok", hidden ? "Product hidden from the store." : "Product is visible on the store again.");
}

export async function staffCreateAction(f: FormData) {
  await requireUser("admin");
  const username = s(f, "username").toLowerCase(), name = s(f, "name"), role = s(f, "role"), password = String(f.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) back("/admin/staff", "error", "Username: 3 to 30 letters, numbers, dots or dashes.");
  if (!name) back("/admin/staff", "error", "Enter the person's name.");
  if (!["admin", "driver"].includes(role)) back("/admin/staff", "error", "Choose a role.");
  if (password.length < 8) back("/admin/staff", "error", "Password must be at least 8 characters.");
  const [dupe] = await q("select 1 from users where username = $1", [username]);
  if (dupe) back("/admin/staff", "error", "That username is already taken.");
  await q("insert into users (username, name, role, password_hash) values ($1,$2,$3,$4)", [username, name.slice(0, 80), role, hashPassword(password)]);
  back("/admin/staff", "ok", `${name} can now log in as "${username}".`);
}

export async function staffUpdateAction(f: FormData) {
  const me = await requireUser("admin");
  const id = Number(s(f, "id")), op = s(f, "op");
  if (op === "password") {
    const password = String(f.get("password") ?? "");
    if (password.length < 8) back("/admin/staff", "error", "Password must be at least 8 characters.");
    await q("update users set password_hash = $2 where id = $1", [id, hashPassword(password)]);
    await q("delete from sessions where user_id = $1", [id]);
    back("/admin/staff", "ok", "Password changed. They need to log in again.");
  }
  if (op === "toggle") {
    if (id === me.id) back("/admin/staff", "error", "You can't deactivate your own account.");
    await q("update users set active = not active where id = $1", [id]);
    await q("delete from sessions where user_id = $1", [id]);
    back("/admin/staff", "ok", "Account updated.");
  }
  back("/admin/staff", "error", "Unknown action.");
}

export async function ownPasswordAction(f: FormData) {
  const me = await requireUser();
  const current = String(f.get("current") ?? ""), next = String(f.get("next") ?? "");
  const [u] = await q<{ password_hash: string }>("select password_hash from users where id = $1", [me.id]);
  if (!verifyPassword(current, u.password_hash)) back("/admin/account", "error", "Your current password is not correct.");
  if (next.length < 8) back("/admin/account", "error", "The new password must be at least 8 characters.");
  await q("update users set password_hash = $2 where id = $1", [me.id, hashPassword(next)]);
  back("/admin/account", "ok", "Password changed.");
}

export async function settingsAction(f: FormData) {
  await requireUser("admin");
  const cost = num(s(f, "default_delivery_cost"));
  if (cost == null) back("/admin/reports", "error", "Enter the delivery cost as a number.");
  await q("insert into settings (key, value) values ('default_delivery_cost', $1) on conflict (key) do update set value = excluded.value", [String(cost)]);
  back("/admin/reports", "ok", "Delivery cost saved.");
}
