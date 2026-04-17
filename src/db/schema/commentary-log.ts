import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const commentaryLog = sqliteTable("commentary_log", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  sport: text("sport").notNull(),
  message: text("message").notNull(),
  postedAt: integer("posted_at").notNull(),
  gameState: text("game_state"),
  // MessageCategory — null on rows written before Fix 4 migration
  category: text("category"),
  // GameStateBucket — null for categories that don't use it (big_play, pre_game, final)
  bucket: text("bucket"),
  // "en" | "es" — null on pre-Fix-4 rows
  language: text("language"),
}, (table) => ([
  index("idx_commentary_game_posted").on(table.gameId, table.postedAt),
  index("idx_commentary_sport_category_posted").on(table.sport, table.category, table.postedAt),
]));
