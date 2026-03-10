import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  tier: text("tier", {
    enum: ["free", "vip_weekly", "vip_monthly", "season_pass"],
  }).notNull(),
  status: text("status", {
    enum: ["active", "trialing", "past_due", "cancelled", "expired"],
  }).notNull(),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
