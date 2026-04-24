import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const parlayLegs = sqliteTable(
  "parlay_legs",
  {
    id: text("id").primaryKey(),
    pickId: text("pick_id").notNull(),
    legIndex: integer("leg_index").notNull(),
    sport: text("sport").notNull(),
    league: text("league"),
    matchup: text("matchup").notNull(),
    pickText: text("pick_text").notNull(),
    gameDate: text("game_date"),
    odds: integer("odds"),
    result: text("result", { enum: ["win", "loss", "push", "void"] }),
    settledAt: text("settled_at"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_parlay_legs_pick_id").on(table.pickId),
    index("idx_parlay_legs_pick_index").on(table.pickId, table.legIndex),
    index("idx_parlay_legs_sport").on(table.sport),
    index("idx_parlay_legs_result").on(table.result),
  ]
);
