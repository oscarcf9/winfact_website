import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id").references(() => users.id),
  referredEmail: text("referred_email").notNull(),
  status: text("status", {
    enum: ["pending", "converted"],
  }).default("pending"),
  rewardApplied: integer("reward_applied", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  convertedAt: text("converted_at"),
});
