import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

// Auto-migrate missing columns on first query (safe for SQLite — ALTER TABLE ADD COLUMN is idempotent-ish)
const _migrated = client.execute(
  "ALTER TABLE picks ADD COLUMN stars INTEGER"
).catch(() => {/* column already exists — ignore */});

const _migratedAudit = client.execute(`
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    admin_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL
  )
`).catch(() => {/* table already exists — ignore */});
