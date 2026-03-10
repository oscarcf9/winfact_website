import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const performanceCache = sqliteTable("performance_cache", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  period: text("period").notNull(),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  pushes: integer("pushes").default(0),
  unitsWon: real("units_won").default(0),
  roiPct: real("roi_pct").default(0),
  clvAvg: real("clv_avg").default(0),
  computedAt: text("computed_at").default(sql`(datetime('now'))`),
});
