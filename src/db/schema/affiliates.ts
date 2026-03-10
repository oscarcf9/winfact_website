import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const affiliates = sqliteTable("affiliates", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  trackingCode: text("tracking_code").notNull().unique(),
  commissionRate: real("commission_rate").default(10), // percentage
  commissionType: text("commission_type", {
    enum: ["percentage", "fixed"],
  }).default("percentage"),
  tier: text("tier", {
    enum: ["standard", "premium", "partner"],
  }).default("standard"),
  totalReferrals: integer("total_referrals").default(0),
  totalConversions: integer("total_conversions").default(0),
  totalEarned: real("total_earned").default(0),
  totalPaid: real("total_paid").default(0),
  paymentMethod: text("payment_method", {
    enum: ["paypal", "stripe", "venmo"],
  }),
  paymentEmail: text("payment_email"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const affiliatePayouts = sqliteTable("affiliate_payouts", {
  id: text("id").primaryKey(),
  affiliateId: text("affiliate_id").references(() => affiliates.id),
  amount: real("amount").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "paid", "rejected"],
  }).default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  paidAt: text("paid_at"),
});
