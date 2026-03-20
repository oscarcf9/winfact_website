import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  titleEn: text("title_en").notNull(),
  titleEs: text("title_es"),
  bodyEn: text("body_en").notNull(),
  bodyEs: text("body_es"),
  category: text("category", {
    enum: ["free_pick", "game_preview", "strategy", "model_breakdown", "news"],
  }),
  featuredImage: text("featured_image"),
  ogImage: text("og_image"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  status: text("status", {
    enum: ["draft", "published", "scheduled"],
  }).default("draft"),
  publishedAt: text("published_at"),
  author: text("author").default("WinFact"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_posts_status").on(table.status),
  index("idx_posts_category").on(table.category),
  index("idx_posts_published_at").on(table.publishedAt),
  index("idx_posts_status_published").on(table.status, table.publishedAt),
]));

export const postTags = sqliteTable("post_tags", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
});
