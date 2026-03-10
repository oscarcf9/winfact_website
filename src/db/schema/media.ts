import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  urlWebp: text("url_webp"),
  urlThumb: text("url_thumb"),
  sizeBytes: integer("size_bytes"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  uploadedAt: text("uploaded_at").default(sql`(datetime('now'))`),
});
