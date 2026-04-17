/**
 * @deprecated
 * Backward-compat shim. The commentary system is now in `src/lib/commentary/`
 * with five categorized prompts, per-category dedup, and a style guard.
 * New callers should use `generateMessage` from `@/lib/commentary` directly.
 *
 * This shim exists only to keep any out-of-repo imports compiling.
 * It maps to the new `game_reaction` category and uses the new style guard.
 */
import { generateMessage, toGameContext, bucketizeGameState } from "./commentary";
import type { LiveGame } from "./espn-live";

export async function generateCommentary(
  game: {
    sport: string;
    league: string;
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    period: number;
    clock: string;
    situation: string;
  },
  _recentCommentary: string[] = [],
  _followUpContext: string = ""
): Promise<string> {
  const live: LiveGame = {
    gameId: `shim-${game.team1}-${game.team2}`,
    sport: game.sport,
    league: game.league,
    team1: game.team1,
    team2: game.team2,
    score1: game.score1,
    score2: game.score2,
    period: game.period,
    clock: game.clock,
    status: "in",
    situation: game.situation,
    isInteresting: true,
  };
  const ctx = toGameContext(live);
  ctx.bucket = bucketizeGameState(live);

  const language = Math.random() < 0.6 ? "es" : "en";
  const result = await generateMessage({
    category: "game_reaction",
    game: ctx,
    language,
  });
  return result.ok ? result.message : "";
}
