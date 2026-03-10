import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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
  analysisEn: text("analysis_en"),
  analysisEs: text("analysis_es"),
  tier: text("tier", { enum: ["free", "vip"] }).default("vip"),
  status: text("status", {
    enum: ["draft", "published", "settled"],
  }).default("draft"),
  result: text("result", { enum: ["win", "loss", "push"] }),
  closingOdds: integer("closing_odds"),
  clv: real("clv"),
  publishedAt: text("published_at"),
  settledAt: text("settled_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
