import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const pricingPlans = sqliteTable("pricing_plans", {
  id: text("id").primaryKey(),
  // Internal key used for Stripe checkout (e.g. "vip_weekly", "vip_monthly")
  key: text("key").unique().notNull(),
  // Display names
  nameEn: text("name_en").notNull(),
  nameEs: text("name_es").notNull(),
  // Description
  descriptionEn: text("description_en").notNull(),
  descriptionEs: text("description_es").notNull(),
  // Pricing
  price: real("price").notNull(),
  currency: text("currency").default("USD"),
  interval: text("interval", { enum: ["week", "month", "year", "forever"] }).notNull(),
  // CTA button text
  ctaEn: text("cta_en").notNull(),
  ctaEs: text("cta_es").notNull(),
  // Features list (JSON array of strings)
  featuresEn: text("features_en").notNull(), // JSON array
  featuresEs: text("features_es").notNull(), // JSON array
  // Stripe
  stripePriceId: text("stripe_price_id"),
  trialDays: integer("trial_days").default(0),
  // Display
  isPopular: integer("is_popular", { mode: "boolean" }).default(false),
  badgeEn: text("badge_en"),
  badgeEs: text("badge_es"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isFree: integer("is_free", { mode: "boolean" }).default(false),
  displayOrder: integer("display_order").default(0),
  // Timestamps
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
