import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const contentQueue = sqliteTable("content_queue", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["blog", "victory_post", "filler"] }).notNull(),
  referenceId: text("reference_id").notNull(),
  title: text("title").notNull(),
  preview: text("preview"),
  imageUrl: text("image_url"),
  captionEn: text("caption_en"),
  captionEs: text("caption_es"),
  hashtags: text("hashtags"),
  platform: text("platform").default("all"), // all, instagram, twitter, etc.
  status: text("status", { enum: ["draft", "scheduled", "posted", "failed"] }).default("draft"),
  scheduledAt: text("scheduled_at"),
  postedAt: text("posted_at"),
  error: text("error"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_content_queue_status").on(table.status),
  index("idx_content_queue_scheduled").on(table.scheduledAt),
  index("idx_content_queue_type").on(table.type),
]));
