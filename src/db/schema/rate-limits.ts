import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const rateLimits = sqliteTable("rate_limits", {
  id: text("id").primaryKey(), // key + window composite
  key: text("key").notNull(), // e.g. "checkout:ip:1.2.3.4" or "email:user:user_123"
  windowStart: integer("window_start").notNull(), // Unix epoch seconds
  count: integer("count").notNull().default(0),
}, (table) => ([
  index("idx_rate_limits_key").on(table.key),
  index("idx_rate_limits_window").on(table.windowStart),
]));
