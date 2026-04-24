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

const _migratedCommentaryLog = client.execute(`
  CREATE TABLE IF NOT EXISTS commentary_log (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    message TEXT NOT NULL,
    posted_at INTEGER NOT NULL,
    game_state TEXT
  )
`).catch(() => {/* table already exists */});

const _migratedCommentaryIdx = client.execute(
  `CREATE INDEX IF NOT EXISTS idx_commentary_game_posted ON commentary_log(game_id, posted_at)`
).catch(() => {});

// Parlay support — auto-applies on startup, idempotent.
const _migratedPickType = client.execute(
  "ALTER TABLE picks ADD COLUMN pick_type TEXT DEFAULT 'single'"
).catch(() => {});
const _migratedLegCount = client.execute(
  "ALTER TABLE picks ADD COLUMN leg_count INTEGER"
).catch(() => {});
const _migratedPickTypeIdx = client.execute(
  "CREATE INDEX IF NOT EXISTS idx_picks_pick_type ON picks(pick_type)"
).catch(() => {});
const _migratedParlayLegs = client.execute(`
  CREATE TABLE IF NOT EXISTS parlay_legs (
    id TEXT PRIMARY KEY NOT NULL,
    pick_id TEXT NOT NULL,
    leg_index INTEGER NOT NULL,
    sport TEXT NOT NULL,
    league TEXT,
    matchup TEXT NOT NULL,
    pick_text TEXT NOT NULL,
    game_date TEXT,
    odds INTEGER,
    result TEXT,
    settled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {});
const _migratedParlayLegsIdx1 = client.execute(
  "CREATE INDEX IF NOT EXISTS idx_parlay_legs_pick_id ON parlay_legs(pick_id)"
).catch(() => {});
const _migratedParlayLegsIdx2 = client.execute(
  "CREATE INDEX IF NOT EXISTS idx_parlay_legs_pick_index ON parlay_legs(pick_id, leg_index)"
).catch(() => {});
const _migratedParlayLegsIdx3 = client.execute(
  "CREATE INDEX IF NOT EXISTS idx_parlay_legs_sport ON parlay_legs(sport)"
).catch(() => {});
const _migratedParlayLegsIdx4 = client.execute(
  "CREATE INDEX IF NOT EXISTS idx_parlay_legs_result ON parlay_legs(result)"
).catch(() => {});

// Per-channel image sizing: content_queue.threads_image_url holds the
// higher-resolution 1440x1800 render for Threads. Idempotent ALTER.
const _migratedThreadsImageUrl = client.execute(
  "ALTER TABLE content_queue ADD COLUMN threads_image_url TEXT"
).catch(() => {});
