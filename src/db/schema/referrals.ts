import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
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
  rewardType: text("reward_type"),
  rewardAppliedAt: text("reward_applied_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  convertedAt: text("converted_at"),
}, (table) => ([
  index("idx_referrals_referrer_id").on(table.referrerId),
  index("idx_referrals_status").on(table.status),
  index("idx_referrals_referred_email").on(table.referredEmail),
  index("idx_referrals_status_reward").on(table.status, table.rewardApplied),
]));
