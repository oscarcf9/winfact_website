import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { picks } from "./picks";

export const deliveryQueue = sqliteTable("delivery_queue", {
  id: text("id").primaryKey(),
  pickId: text("pick_id").references(() => picks.id),
  channels: text("channels").notNull(), // JSON array: ["telegram_free","telegram_vip","email","push"]
  tier: text("tier", { enum: ["free", "vip"] }).notNull(),
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
  }).default("pending"),
  scheduledFor: text("scheduled_for"), // ISO datetime for scheduled sends
  processedAt: text("processed_at"),
  error: text("error"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
