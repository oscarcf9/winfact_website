import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
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
  batchId: text("batch_id"),
  scheduledFor: text("scheduled_for"), // ISO datetime for scheduled sends
  processedAt: text("processed_at"),
  error: text("error"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_delivery_queue_status").on(table.status),
  index("idx_delivery_queue_scheduled_for").on(table.scheduledFor),
  index("idx_delivery_queue_status_scheduled").on(table.status, table.scheduledFor),
  index("idx_delivery_queue_status_batch").on(table.status, table.batchId),
]));
