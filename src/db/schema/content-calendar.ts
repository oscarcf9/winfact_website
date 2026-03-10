import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const contentCalendar = sqliteTable("content_calendar", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["blog_post", "free_pick", "social", "email", "telegram"],
  }).notNull(),
  stage: text("stage", {
    enum: ["idea", "draft", "review", "scheduled", "published"],
  }).default("idea"),
  scheduledDate: text("scheduled_date"),
  assignedTo: text("assigned_to"),
  linkedPostId: text("linked_post_id"),
  linkedPickId: text("linked_pick_id"),
  template: text("template", {
    enum: ["game_preview", "free_pick_of_day", "model_breakdown", "sharp_money_report", "weekly_recap", "custom"],
  }),
  notes: text("notes"),
  sport: text("sport"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
