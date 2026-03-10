import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { picks } from "./picks";
import { users } from "./users";

export const pickAuditLog = sqliteTable("pick_audit_log", {
  id: text("id").primaryKey(),
  pickId: text("pick_id").references(() => picks.id),
  userId: text("user_id").references(() => users.id),
  action: text("action", {
    enum: ["created", "updated", "published", "settled", "deleted"],
  }).notNull(),
  changesSummary: text("changes_summary"), // JSON of what changed
  snapshotBefore: text("snapshot_before"), // JSON of pick state before
  snapshotAfter: text("snapshot_after"), // JSON of pick state after
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
