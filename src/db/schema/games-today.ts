import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const gamesToday = sqliteTable("games_today", {
  id: text("id").primaryKey(),
  sport: text("sport").notNull(),
  gameId: text("game_id").notNull().unique(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  commenceTime: text("commence_time").notNull(),
  venue: text("venue"),
  status: text("status", {
    enum: ["scheduled", "live", "final", "postponed"],
  }).default("scheduled"),
  modelSpread: real("model_spread"),
  modelTotal: real("model_total"),
  modelEdge: real("model_edge"),
  sharpAction: text("sharp_action"), // JSON: { side, confidence }
  publicBetPct: real("public_bet_pct"),
  publicMoneyPct: real("public_money_pct"),
  injuryReport: text("injury_report"), // JSON array
  weather: text("weather"), // JSON: { temp, wind, precip }
  pickStatus: text("pick_status", {
    enum: ["pending", "posted", "skip"],
  }).default("pending"),
  pickId: text("pick_id"),
  edgeTier: text("edge_tier", {
    enum: ["strong", "moderate", "none"],
  }).default("none"),
  fetchedAt: text("fetched_at").default(sql`(datetime('now'))`),
});
