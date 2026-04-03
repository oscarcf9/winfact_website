import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const ticketHistory = sqliteTable("ticket_history", {
  id: text("id").primaryKey(),
  /** R2 URL of the generated PNG */
  imageUrl: text("image_url").notNull(),
  /** JSON blob of the full form data used to generate this ticket */
  formData: text("form_data").notNull(),
  /** Quick-reference fields extracted from formData */
  sport: text("sport"),
  betType: text("bet_type"),
  subBetType: text("sub_bet_type"),
  betDescription: text("bet_description"),
  matchup: text("matchup"),
  odds: text("odds"),
  wager: text("wager"),
  paid: text("paid"),
  /** Optional link to a pick in the picks table */
  pickId: text("pick_id"),
  /** Optional link to an external game/results URL */
  gameUrl: text("game_url"),
  /** File size in bytes */
  sizeBytes: integer("size_bytes"),
  /** Who generated it */
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
