import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const promoCodes = sqliteTable("promo_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type", {
    enum: ["percent", "fixed", "trial_days"],
  }).notNull(),
  discountValue: real("discount_value").notNull(), // % or $ or days
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  applicablePlans: text("applicable_plans"), // JSON array of plan keys
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  stripeCouponId: text("stripe_coupon_id"),
  stripePromotionId: text("stripe_promotion_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
