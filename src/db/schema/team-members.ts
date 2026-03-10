import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  teamRole: text("team_role", {
    enum: ["owner", "analyst", "writer", "support"],
  }).notNull(),
  permissions: text("permissions"), // JSON array of allowed actions
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  invitedBy: text("invited_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g., "pick.created", "post.published"
  resourceType: text("resource_type"), // "pick", "post", "content", etc.
  resourceId: text("resource_id"),
  details: text("details"), // JSON
  ipAddress: text("ip_address"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
