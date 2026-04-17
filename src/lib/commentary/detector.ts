import type { LiveGame } from "@/lib/espn-live";
import { bucketizeGameState } from "./types";
import type {
  MessageCategory,
  GameContext,
  GameDelta,
  DetectionResult,
} from "./types";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { and, eq, gte, like, or } from "drizzle-orm";
import { hasCategoryFiredRecently, getLastSnapshotForGame } from "./dedup";

/**
 * Frequency caps, per category. Beyond these, the detector returns null so
 * the cron moves on to another game.
 */
export const FREQ_CAP_SECONDS: Record<MessageCategory, number> = {
  game_reaction: 20 * 60,  // max 1 per game per 20 min
  big_play: 3 * 60,        // max 1 big_play per game per 3 min (anti-spam on noisy events)
  pick_update: 30 * 60,    // max 1 per game per 30 min
  pre_game: 24 * 3600,     // once per game (window huge)
  final: 24 * 3600,        // once per game
};

/**
 * Score-delta thresholds that constitute a "big play" per sport.
 * These are rough heuristics — a real HR in MLB is +1-4 runs in one at-bat,
 * a TD in NFL is +6-8, etc.
 */
const BIG_PLAY_SCORE_DELTA: Record<string, number> = {
  NBA: 8,     // a 8-0 run or a big and-one sequence
  NFL: 7,     // one TD minimum
  NHL: 1,     // any goal
  MLB: 2,     // any 2+ run change
  LALIGA: 1,  // any goal
  PREMIER: 1,
  LIGA_MX: 1,
  UCL: 1,
};

/**
 * Does this game currently have an active WinFact pick attached?
 * Matches heuristically on matchup substring + gameDate proximity.
 * Used by the pick_update category detector.
 */
async function hasActivePickForGame(game: LiveGame): Promise<boolean> {
  // Be tolerant: match either "Team A" or "Team B" as a substring of the pick matchup.
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const rows = await db
      .select({ id: picks.id })
      .from(picks)
      .where(
        and(
          eq(picks.sport, game.sport),
          eq(picks.status, "published"),
          or(
            gte(picks.gameDate, yesterday),
            gte(picks.gameDate, today)
          ),
          or(
            like(picks.matchup, `%${game.team1}%`),
            like(picks.matchup, `%${game.team2}%`)
          )
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Compute delta between the current game state and the most recent snapshot
 * logged for this game. Returns a zero-delta if no prior snapshot exists.
 */
export async function computeGameDelta(game: LiveGame): Promise<GameDelta> {
  const prior = await getLastSnapshotForGame(game.gameId);
  if (!prior || !prior.gameState) {
    return { scoreDelta: 0, leaderFlipped: false, periodAdvanced: false, snapshotAgeSeconds: 0 };
  }

  type PriorState = { score?: string; period?: number };
  let parsed: PriorState = {};
  try {
    parsed = JSON.parse(prior.gameState) as PriorState;
  } catch {
    return { scoreDelta: 0, leaderFlipped: false, periodAdvanced: false, snapshotAgeSeconds: 0 };
  }

  const [s1Prior, s2Prior] = (parsed.score ?? "0-0").split("-").map((n) => parseInt(n, 10) || 0);
  const priorPeriod = parsed.period ?? 0;

  const scoreDelta = Math.abs((game.score1 - s1Prior)) + Math.abs((game.score2 - s2Prior));

  const priorLeader = s1Prior === s2Prior ? null : (s1Prior > s2Prior ? 1 : 2);
  const currentLeader = game.score1 === game.score2 ? null : (game.score1 > game.score2 ? 1 : 2);
  const leaderFlipped =
    priorLeader !== null && currentLeader !== null && priorLeader !== currentLeader;

  const periodAdvanced = game.period > priorPeriod;

  const snapshotAgeSeconds = Math.max(0, Math.floor(Date.now() / 1000) - prior.postedAt);

  return { scoreDelta, leaderFlipped, periodAdvanced, snapshotAgeSeconds };
}

/**
 * Decide which (if any) message category applies to this game right now.
 * Returns the category with the highest priority first (big_play > final >
 * pre_game > pick_update > game_reaction), respecting frequency caps.
 */
export async function detectCategory(game: LiveGame, delta: GameDelta): Promise<DetectionResult> {
  // Pre-game
  if (game.status === "pre") {
    if (await hasCategoryFiredRecently({
      category: "pre_game",
      gameId: game.gameId,
      windowSeconds: FREQ_CAP_SECONDS.pre_game,
    })) {
      return { category: null, reason: "pre_game_already_fired" };
    }
    return { category: "pre_game", reason: "status=pre" };
  }

  // Final (ESPN-live currently filters for status=in, so this branch is
  // reached only if a future caller widens the filter).
  if (game.status === "post") {
    if (await hasCategoryFiredRecently({
      category: "final",
      gameId: game.gameId,
      windowSeconds: FREQ_CAP_SECONDS.final,
    })) {
      return { category: null, reason: "final_already_fired" };
    }
    return { category: "final", reason: "status=post" };
  }

  // From here on the game is in-progress.
  const threshold = BIG_PLAY_SCORE_DELTA[game.sport] ?? 2;
  const isBigPlay =
    (delta.scoreDelta >= threshold || delta.leaderFlipped) && delta.snapshotAgeSeconds > 0;

  if (isBigPlay) {
    if (!(await hasCategoryFiredRecently({
      category: "big_play",
      gameId: game.gameId,
      windowSeconds: FREQ_CAP_SECONDS.big_play,
    }))) {
      return {
        category: "big_play",
        reason: delta.leaderFlipped ? "leader_flipped" : `score_delta=${delta.scoreDelta}`,
      };
    }
  }

  // Pick-related update (Telegram-only, higher priority than game_reaction)
  if (await hasActivePickForGame(game)) {
    if (!(await hasCategoryFiredRecently({
      category: "pick_update",
      gameId: game.gameId,
      windowSeconds: FREQ_CAP_SECONDS.pick_update,
    }))) {
      return { category: "pick_update", reason: "active_pick_on_game" };
    }
  }

  // Default: generic game reaction
  if (!(await hasCategoryFiredRecently({
    category: "game_reaction",
    gameId: game.gameId,
    windowSeconds: FREQ_CAP_SECONDS.game_reaction,
  }))) {
    return { category: "game_reaction", reason: "in_progress" };
  }

  return { category: null, reason: "all_caps_hit" };
}

/**
 * Build a GameContext envelope from a LiveGame plus the computed bucket.
 */
export function toGameContext(game: LiveGame): GameContext {
  return {
    gameId: game.gameId,
    sport: game.sport,
    league: game.league,
    team1: game.team1,
    team2: game.team2,
    score1: game.score1,
    score2: game.score2,
    period: game.period,
    clock: game.clock,
    status: game.status,
    bucket: bucketizeGameState(game),
  };
}
