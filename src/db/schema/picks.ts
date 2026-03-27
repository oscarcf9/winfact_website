import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const picks = sqliteTable("picks", {
  id: text("id").primaryKey(),
  sport: text("sport").notNull(),
  league: text("league"),
  matchup: text("matchup").notNull(),
  pickText: text("pick_text").notNull(),
  gameDate: text("game_date"),
  odds: integer("odds"),
  units: real("units"),
  modelEdge: real("model_edge"),
  confidence: text("confidence", {
    enum: ["top", "strong", "standard"],
  }).default("standard"),
  stars: integer("stars"),  // 1-5 star rating, replaces confidence
  analysisEn: text("analysis_en"),
  analysisEs: text("analysis_es"),
  tier: text("tier", { enum: ["free", "vip"] }).default("vip"),
  status: text("status", {
    enum: ["draft", "published", "settled"],
  }).default("draft"),
  result: text("result", { enum: ["win", "loss", "push", "void"] }),
  closingOdds: integer("closing_odds"),
  clv: real("clv"),
  capperId: text("capper_id"),
  publishedAt: text("published_at"),
  settledAt: text("settled_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ([
  index("idx_picks_sport").on(table.sport),
  index("idx_picks_status").on(table.status),
  index("idx_picks_tier").on(table.tier),
  index("idx_picks_published_at").on(table.publishedAt),
  index("idx_picks_game_date").on(table.gameDate),
  index("idx_picks_status_tier").on(table.status, table.tier),
  index("idx_picks_sport_status").on(table.sport, table.status),
  index("idx_picks_status_published").on(table.status, table.publishedAt),
  index("idx_picks_status_result").on(table.status, table.result),
]));
