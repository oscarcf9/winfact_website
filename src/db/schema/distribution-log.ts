import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Every per-channel Buffer/Telegram distribution attempt writes one row here.
 * Append-only. Used for debugging "did this actually post to X?" in under 30s
 * without opening Buffer's UI.
 */
export const distributionLog = sqliteTable("distribution_log", {
  id: text("id").primaryKey(),
  contentType: text("content_type", {
    enum: ["commentary", "filler", "victory", "blog", "test"],
  }).notNull(),
  referenceId: text("reference_id"),            // e.g. commentary_log.id, content_queue.id
  channel: text("channel").notNull(),            // "twitter" | "threads" | "instagram" | "facebook" | "telegram_free"
  status: text("status", { enum: ["success", "failed"] }).notNull(),
  bufferPostId: text("buffer_post_id"),
  error: text("error"),
  latencyMs: integer("latency_ms"),
  createdAt: integer("created_at").notNull(),
}, (table) => ([
  index("idx_dist_log_content_created").on(table.contentType, table.createdAt),
  index("idx_dist_log_channel_created").on(table.channel, table.createdAt),
  index("idx_dist_log_status_created").on(table.status, table.createdAt),
]));
