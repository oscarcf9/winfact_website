import { db } from "@/db";
import { commentaryLog } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { MessageCategory, GameStateBucket } from "./types";

/**
 * Scope by category — how many prior messages to feed the generator
 * as "do not repeat these" context.
 */
const DEDUP_LIMIT: Record<MessageCategory, number> = {
  game_reaction: 10,
  big_play: 5,
  pick_update: 5,
  pre_game: 3,
  final: 5,
};

/**
 * Fetch recent commentary_log messages that should be shown to the generator
 * as "do NOT repeat these."
 *
 * Scope:
 *   - game_reaction: same sport + same bucket (the intuition: two close late-game
 *     messages about different games should still avoid sounding alike)
 *   - big_play / pick_update / final: same sport
 *   - pre_game: same sport
 *
 * Falls back to messages with null category/bucket (older rows) so the dedup
 * surface degrades gracefully post-migration.
 */
export async function getRecentMessagesForDedup(input: {
  category: MessageCategory;
  sport: string;
  bucket?: GameStateBucket | null;
}): Promise<string[]> {
  const limit = DEDUP_LIMIT[input.category];

  // game_reaction uses a sport+bucket filter; others use sport only.
  const conditions = [eq(commentaryLog.sport, input.sport)];
  if (input.category === "game_reaction" && input.bucket) {
    conditions.push(eq(commentaryLog.bucket, input.bucket));
  }

  const rows = await db
    .select({ message: commentaryLog.message })
    .from(commentaryLog)
    .where(and(...conditions))
    .orderBy(desc(commentaryLog.postedAt))
    .limit(limit);

  return rows.map((r) => r.message);
}

/**
 * Fetch the most recent snapshot of a specific game (gameState JSON blob).
 * Used for delta detection in big-play / lead-change situations.
 */
export async function getLastSnapshotForGame(gameId: string): Promise<{
  postedAt: number;
  gameState: string | null;
  message: string;
} | null> {
  const [row] = await db
    .select({
      postedAt: commentaryLog.postedAt,
      gameState: commentaryLog.gameState,
      message: commentaryLog.message,
    })
    .from(commentaryLog)
    .where(eq(commentaryLog.gameId, gameId))
    .orderBy(desc(commentaryLog.postedAt))
    .limit(1);

  return row ?? null;
}

/**
 * Has this category fired for this game within `windowSeconds`?
 * Used by frequency caps so a single game doesn't get spammed with
 * the same category of message.
 */
export async function hasCategoryFiredRecently(input: {
  category: MessageCategory;
  gameId: string;
  windowSeconds: number;
}): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - input.windowSeconds;
  const [row] = await db
    .select({ id: commentaryLog.id })
    .from(commentaryLog)
    .where(
      and(
        eq(commentaryLog.gameId, input.gameId),
        eq(commentaryLog.category, input.category)
      )
    )
    .orderBy(desc(commentaryLog.postedAt))
    .limit(1);

  if (!row) return false;

  const [row2] = await db
    .select({ postedAt: commentaryLog.postedAt })
    .from(commentaryLog)
    .where(eq(commentaryLog.id, row.id))
    .limit(1);

  return (row2?.postedAt ?? 0) > cutoff;
}
