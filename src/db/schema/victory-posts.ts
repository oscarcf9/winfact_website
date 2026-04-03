import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const victoryPosts = sqliteTable("victory_posts", {
  id: text("id").primaryKey(),
  pickId: text("pick_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull(),
  sport: text("sport").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("draft"),
  postedAt: text("posted_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
