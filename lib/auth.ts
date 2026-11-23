import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasDb, q } from "./db";

export type Role = "admin" | "driver";
export type User = { id: number; username: string; name: string; role: Role };

const COOKIE = "evq_session";
const DAYS = 30;
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = crypto.scryptSync(password, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Returns an error message, or null after setting the session cookie. */
export async function login(usernameRaw: string, password: string): Promise<string | null> {
  const username = usernameRaw.trim().toLowerCase();
  if (!username || !password) return "Enter your username and password.";
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from login_attempts where username = $1 and at > now() - interval '15 minutes'", [username]);
  if (n >= 8) return "Too many attempts. Try again in 15 minutes.";
  const [u] = await q<{ id: number; password_hash: string; active: boolean }>("select id, password_hash, active from users where username = $1", [username]);
  if (!u || !u.active || !verifyPassword(password, u.password_hash)) {
    await q("insert into login_attempts (username) values ($1)", [username]);
    return "Wrong username or password.";
  }
  await q("delete from login_attempts where username = $1", [username]);
  await q("delete from sessions where expires_at < now()");
  const token = crypto.randomBytes(32).toString("hex");
  await q("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + $3::interval)", [sha(token), u.id, `${DAYS} days`]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DAYS * 86400 });
  return null;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token && hasDb) await q("delete from sessions where token_hash = $1", [sha(token)]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  if (!hasDb) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [u] = await q<User>(
    "select u.id, u.username, u.name, u.role from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now() and u.active",
    [sha(token)],
  );
  return u ?? null;
}

/** Use at the top of every portal page and server action. */
export async function requireUser(role?: Role): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  if (role && u.role !== role) redirect("/admin/orders");
  return u;
}
