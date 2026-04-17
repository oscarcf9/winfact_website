import type { LiveGame } from "@/lib/espn-live";

export type MessageCategory =
  | "game_reaction"
  | "big_play"
  | "pick_update"
  | "pre_game"
  | "final";

export type GameStateBucket =
  | "early_close"      // first third of game, score within ~5%
  | "early_blowout"    // first third, margin > 15%
  | "mid_close"        // middle third, within ~5%
  | "mid_lead_change"  // middle third, lead flipped since last snapshot
  | "late_close"       // final third/period, within ~5%
  | "late_clock_kill"  // final portion, margin > 10% (garbage time)
  | "overtime"         // any OT/extra innings/shootout
  | "pregame"          // not yet started
  | "final";           // game over

export type Language = "en" | "es";

export type GameContext = {
  gameId: string;
  sport: string;
  league: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number;
  clock: string;
  status: "pre" | "in" | "post";
  bucket: GameStateBucket;
  startTime?: string | null; // ISO, for pre_game
};

export type GameDelta = {
  // Score change since the most recent prior snapshot of this game
  scoreDelta: number;        // absolute sum of score changes across both teams
  leaderFlipped: boolean;    // true if the leading team changed
  periodAdvanced: boolean;   // true if we moved to a new period/inning/quarter
  snapshotAgeSeconds: number; // how long since the prior snapshot (0 if no prior)
};

export type DetectionResult =
  | { category: MessageCategory; reason: string }
  | { category: null; reason: string };

export type GenerationInput = {
  category: MessageCategory;
  game: GameContext;
  delta?: GameDelta;
  language: Language;
  recentMessages: string[]; // pre-fetched via dedup.ts
};

export type GenerationResult =
  | { ok: true; message: string; language: Language; category: MessageCategory; bucket: GameStateBucket | null }
  | { ok: false; reason: string };

/**
 * Bucketize an in-progress or terminal game state.
 * Pre-game games should be assigned "pregame" externally before calling this.
 */
export function bucketizeGameState(game: LiveGame): GameStateBucket {
  if (game.status === "pre") return "pregame";
  if (game.status === "post") return "final";

  const sport = game.sport;
  const diff = Math.abs(game.score1 - game.score2);
  const total = game.score1 + game.score2;
  const period = game.period;

  // Sport-specific thirds of the game
  const thirdsMap: Record<string, { mid: number; late: number; overtimeFrom: number }> = {
    NBA:    { mid: 2, late: 4, overtimeFrom: 5 },
    NFL:    { mid: 2, late: 4, overtimeFrom: 5 },
    NHL:    { mid: 2, late: 3, overtimeFrom: 4 },
    MLB:    { mid: 4, late: 7, overtimeFrom: 10 },
    LALIGA: { mid: 2, late: 2, overtimeFrom: 3 },
    PREMIER:{ mid: 2, late: 2, overtimeFrom: 3 },
    LIGA_MX:{ mid: 2, late: 2, overtimeFrom: 3 },
    UCL:    { mid: 2, late: 2, overtimeFrom: 3 },
  };
  const thirds = thirdsMap[sport] || thirdsMap.NBA;

  if (period >= thirds.overtimeFrom) return "overtime";

  // "Close" threshold scaled by total points
  const closeThreshold =
    sport === "MLB" ? 3 :
    sport === "NHL" ? 2 :
    ["LALIGA", "PREMIER", "LIGA_MX", "UCL"].includes(sport) ? 1 :
    /* NBA/NFL */ Math.max(5, Math.floor(total * 0.05));
  const blowoutThreshold = sport === "NBA" ? 20 : sport === "NFL" ? 17 : sport === "MLB" ? 6 : 4;

  const isClose = diff <= closeThreshold;
  const isBlowout = diff > blowoutThreshold;

  if (period < thirds.mid) {
    return isBlowout ? "early_blowout" : "early_close";
  }
  if (period < thirds.late) {
    return isClose ? "mid_close" : "mid_lead_change";
  }
  // Late
  if (isClose) return "late_close";
  if (isBlowout) return "late_clock_kill";
  return "late_close";
}
