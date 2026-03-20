import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role", { enum: ["admin", "member"] }).default("member"),
  language: text("language", { enum: ["en", "es"] }).default("en"),
  stripeCustomerId: text("stripe_customer_id"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by").references((): ReturnType<typeof text> => users.id),
  emailOptOut: integer("email_opt_out").default(0),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_users_referred_by").on(table.referredBy),
  index("idx_users_role").on(table.role),
  index("idx_users_stripe_customer_id").on(table.stripeCustomerId),
]));
