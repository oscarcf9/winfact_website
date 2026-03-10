import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  channelEmail: integer("channel_email", { mode: "boolean" }).default(true),
  channelPush: integer("channel_push", { mode: "boolean" }).default(true),
  channelSms: integer("channel_sms", { mode: "boolean" }).default(false),
  channelTelegram: integer("channel_telegram", { mode: "boolean" }).default(false),
  sportMlb: integer("sport_mlb", { mode: "boolean" }).default(true),
  sportNfl: integer("sport_nfl", { mode: "boolean" }).default(true),
  sportNba: integer("sport_nba", { mode: "boolean" }).default(true),
  sportNhl: integer("sport_nhl", { mode: "boolean" }).default(true),
  sportSoccer: integer("sport_soccer", { mode: "boolean" }).default(true),
  sportNcaa: integer("sport_ncaa", { mode: "boolean" }).default(true),
  quietHoursStart: text("quiet_hours_start"), // "22:00"
  quietHoursEnd: text("quiet_hours_end"), // "08:00"
  timezone: text("timezone").default("America/New_York"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
