import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const channelConfigs = sqliteTable("channel_configs", {
  id: text("id").primaryKey(),
  channel: text("channel", {
    enum: ["telegram_free", "telegram_vip", "email", "push", "sms"],
  }).notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  config: text("config").notNull(), // JSON: API keys, chat IDs, etc.
  lastTestedAt: text("last_tested_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
