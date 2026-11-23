// Applies db/schema.sql and creates the first admin. Runs before every build; does nothing without DATABASE_URL.
import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log("db-migrate: no DATABASE_URL, skipping (portal disabled, store works without it).");
  process.exit(0);
}
const local = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const { rows } = await client.query("select count(*)::int as n from users");
  if (rows[0].n === 0) {
    const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.log("db-migrate: no users yet and ADMIN_PASSWORD is not set; no admin created.");
    } else {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      await client.query("insert into users (username, name, role, password_hash) values ($1, $2, 'admin', $3)", [username, "Admin", `scrypt$${salt}$${hash}`]);
      console.log(`db-migrate: created first admin "${username}".`);
    }
  }
  console.log("db-migrate: schema up to date.");
} finally {
  await client.end();
}
