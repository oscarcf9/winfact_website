import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { picks } from "./picks";

export const deliveryLogs = sqliteTable("delivery_logs", {
  id: text("id").primaryKey(),
  pickId: text("pick_id").references(() => picks.id),
  queueId: text("queue_id"),
  channel: text("channel", {
    enum: ["telegram_free", "telegram_vip", "email", "push", "sms"],
  }).notNull(),
  status: text("status", {
    enum: ["sent", "delivered", "failed", "bounced"],
  }).notNull(),
  recipientCount: integer("recipient_count").default(0),
  metadata: text("metadata"), // JSON: message_id, open_rate, etc.
  error: text("error"),
  sentAt: text("sent_at").default(sql`(datetime('now'))`),
});
