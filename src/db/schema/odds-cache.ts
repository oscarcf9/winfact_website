import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const oddsCache = sqliteTable("odds_cache", {
  id: text("id").primaryKey(),
  sport: text("sport").notNull(),
  gameId: text("game_id").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  commenceTime: text("commence_time").notNull(),
  bookmaker: text("bookmaker").notNull(),
  marketType: text("market_type", {
    enum: ["h2h", "spreads", "totals"],
  }).notNull(),
  homeOdds: real("home_odds"),
  awayOdds: real("away_odds"),
  drawOdds: real("draw_odds"),
  spreadHome: real("spread_home"),
  spreadAway: real("spread_away"),
  totalOver: real("total_over"),
  totalUnder: real("total_under"),
  openingHomeOdds: real("opening_home_odds"),
  openingAwayOdds: real("opening_away_odds"),
  lineMovement: real("line_movement"),
  fetchedAt: text("fetched_at").default(sql`(datetime('now'))`),
});
