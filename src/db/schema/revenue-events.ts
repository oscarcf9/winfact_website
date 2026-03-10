import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const revenueEvents = sqliteTable("revenue_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  type: text("type", {
    enum: ["new_mrr", "expansion", "contraction", "churn", "reactivation"],
  }).notNull(),
  amount: real("amount").notNull(), // monthly amount in dollars
  tier: text("tier"),
  stripeEventId: text("stripe_event_id"),
  promoCode: text("promo_code"),
  affiliateId: text("affiliate_id"),
  source: text("source"), // organic, paid, referral
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
