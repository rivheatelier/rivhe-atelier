// Applies supabase/migrations/*.sql that haven't run yet; with --seed, also runs supabase/seed.sql.
// Applied migrations are recorded in the same table the Supabase CLI uses, so
// `supabase db push` and this script stay in sync.
//
// Needs SUPABASE_DB_URL (Supabase → Connect → Session pooler), read from the
// environment or from .env.local. The URL is never printed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");

const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

const raw = process.env.SUPABASE_DB_URL;
if (!raw || raw.includes("[YOUR-PASSWORD]")) {
  console.error("Set SUPABASE_DB_URL in .env.local (Supabase → Connect → Session pooler, with the real password).");
  process.exit(1);
}

// Supabase serves its own certificate chain; encrypt without verifying it.
const url = new URL(raw);
url.searchParams.delete("sslmode");
const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

const migrationsDir = path.join(root, "supabase", "migrations");

await client.connect();
try {
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  `);
  const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    const [version, ...nameParts] = file.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)", [
        version,
        nameParts.join("_"),
        [sql],
      ]);
      await client.query("commit");
      console.log(`apply  ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  if (process.argv.includes("--seed")) {
    await client.query(readFileSync(path.join(root, "supabase", "seed.sql"), "utf8"));
    console.log("seed   supabase/seed.sql");
  }

  // Let the Data API see the new tables and functions right away.
  await client.query("notify pgrst, 'reload schema'");
  console.log("done");
} finally {
  await client.end();
}
