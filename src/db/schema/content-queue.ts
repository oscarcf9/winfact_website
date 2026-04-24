import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const contentQueue = sqliteTable("content_queue", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["blog", "victory_post", "filler"] }).notNull(),
  referenceId: text("reference_id").notNull(),
  title: text("title").notNull(),
  preview: text("preview"),
  imageUrl: text("image_url"),
  // Higher-resolution 1440x1800 (4:5) image used when posting to Threads.
  // Falls back to imageUrl if null. Generated alongside imageUrl by
  // generateMatchupImage and persisted so retries use the same assets.
  threadsImageUrl: text("threads_image_url"),
  captionEn: text("caption_en"),
  captionEs: text("caption_es"),
  hashtags: text("hashtags"),
  platform: text("platform").default("all"), // "all" | preset route | comma-separated channel keys (e.g. "instagram,facebook")
  status: text("status", { enum: ["draft", "scheduled", "processing", "posted", "failed"] }).default("draft"),
  scheduledAt: text("scheduled_at"),
  // ISO timestamp set the moment the queue processor claims this row.
  // Used by the stale-reclaim step to recover from crashed/timed-out processor runs.
  processingStartedAt: text("processing_started_at"),
  // Retry counter for rows that partially succeeded. Incremented each time
  // a new retry row is enqueued for failed channels. Hard-capped at 2.
  retryCount: integer("retry_count").default(0),
  postedAt: text("posted_at"),
  error: text("error"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_content_queue_status").on(table.status),
  index("idx_content_queue_scheduled").on(table.scheduledAt),
  index("idx_content_queue_type").on(table.type),
  index("idx_content_queue_status_scheduled").on(table.status, table.scheduledAt),
]));
