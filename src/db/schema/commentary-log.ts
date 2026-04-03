import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const commentaryLog = sqliteTable("commentary_log", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  sport: text("sport").notNull(),
  message: text("message").notNull(),
  postedAt: integer("posted_at").notNull(),
  gameState: text("game_state"),
}, (table) => ([
  index("idx_commentary_game_posted").on(table.gameId, table.postedAt),
]));
