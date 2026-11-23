import { Pool, PoolClient, QueryResultRow } from "pg";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
/** False until a database is connected; the store then behaves as a plain catalogue with WhatsApp ordering. */
export const hasDb = Boolean(url);

const g = globalThis as unknown as { __evqPool?: Pool };
function pool() {
  if (!hasDb) throw new Error("Database is not configured");
  if (!g.__evqPool) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__evqPool = new Pool({ connectionString: url, max: 5, ssl: local ? false : { rejectUnauthorized: true } });
  }
  return g.__evqPool;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query<T>(text, params)).rows;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
