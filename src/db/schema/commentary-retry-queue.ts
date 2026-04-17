import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commentaryLog } from "./commentary-log";

/**
 * Retry queue for commentary distributions that failed on specific channels.
 * Processed by /api/cron/retry-failed-distribution (every 10 min).
 *
 * Exponential backoff: attempt 1 fails → retry in 5 min, 2 fails → 15 min,
 * 3 fails → 45 min; if 3rd retry also fails, status = failed_permanent and
 * Telegram admin is alerted.
 */
export const commentaryRetryQueue = sqliteTable("commentary_retry_queue", {
  id: text("id").primaryKey(),
  originalLogId: text("original_log_id").references(() => commentaryLog.id, { onDelete: "set null" }),
  failedChannel: text("failed_channel", {
    enum: ["twitter", "threads", "instagram", "facebook"],
  }).notNull(),
  messageText: text("message_text").notNull(),
  mediaUrl: text("media_url"),
  retryCount: integer("retry_count").default(0).notNull(),
  nextRetryAt: integer("next_retry_at").notNull(), // unix seconds
  status: text("status", {
    enum: ["pending", "succeeded", "failed_permanent"],
  }).default("pending").notNull(),
  lastError: text("last_error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ([
  index("idx_retry_status_next").on(table.status, table.nextRetryAt),
  index("idx_retry_channel").on(table.failedChannel),
]));
