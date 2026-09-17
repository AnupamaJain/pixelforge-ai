/**
 * Applies SQL migrations to a Supabase Postgres database.
 *
 * Supabase's CLI can only push to projects inside the logged-in account, which
 * is not always where the target project lives. This connects directly with a
 * pooler URL instead.
 *
 * Applied migrations are recorded in `schema_migrations`, so re-running is safe
 * and only new files execute.
 *
 *   SUPABASE_DB_URL=postgresql://... node scripts/db-migrate.mjs
 *
 * The URL is read from the environment and never committed. Get it from
 * Supabase → Project Settings → Database → Connection string → Session pooler.
 */

import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CS = process.env.SUPABASE_DB_URL;

if (!CS) {
  console.error(
    "\n  SUPABASE_DB_URL is not set.\n" +
      "  Supabase → Project Settings → Database → Connection string → Session pooler\n" +
      "  Then: SUPABASE_DB_URL='postgresql://...' node scripts/db-migrate.mjs\n",
  );
  process.exit(1);
}

const MIGRATIONS_DIR = "supabase/migrations";

const client = new Client({
  connectionString: CS,
  // Supabase terminates TLS at the pooler with a certificate chain Node does
  // not ship a root for; the connection is still encrypted.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

await client.query(`
  create table if not exists public.schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const applied = new Set(
  (await client.query("select name from public.schema_migrations")).rows.map((r) => r.name),
);

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  SKIP   ${file}`);
    continue;
  }

  const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  process.stdout.write(`  APPLY  ${file} ... `);

  try {
    // `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block.
    const needsAutocommit = /alter\s+type\s+\S+\s+add\s+value/i.test(sql);

    if (needsAutocommit) {
      await client.query(sql);
    } else {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
    }

    await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
    console.log("ok");
    ran += 1;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    console.log("FAILED");
    console.error(`\n  ${error.message}`);
    if (error.position) {
      const pos = Number(error.position);
      console.error(`\n  near: ${sql.slice(Math.max(0, pos - 100), pos + 100)}`);
    }
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(ran === 0 ? "\n  already up to date\n" : `\n  ${ran} migration(s) applied\n`);
