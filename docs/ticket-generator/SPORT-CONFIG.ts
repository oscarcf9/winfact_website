/**
 * Sport → Bet Sub-Type Configuration
 *
 * Extracted from the Flutter ticket generator codebase.
 * The original app does NOT have a sport selector — it uses a flat list of sub-types.
 * This config organizes those sub-types by sport for a better UX in the web version.
 *
 * Usage: When user selects a sport, show only the applicable bet sub-types.
 * The "display" string is what appears on the ticket itself.
 */

export interface BetSubType {
  /** Internal identifier */
  id: string;
  /** Human-readable label for the form dropdown */
  label: string;
  /** Text displayed on the ticket (uppercase, e.g., "TO WIN", "SPREAD") */
  display: string;
  /** Which sports this sub-type applies to */
  sports: Sport[];
}

export type Sport =
  | "mlb"
  | "nfl"
  | "nba"
  | "nhl"
  | "ncaaf"
  | "ncaab"
  | "soccer"
  | "mma"
  | "boxing"
  | "tennis"
  | "golf"
  | "other";

export type BetType = "Single" | "Parlay";

export interface ParlayOption {
  id: string;
  label: string;
  legs: number | "custom";
}

// ────────────────────────────────────────
// Single Bet Sub-Types
// ────────────────────────────────────────

export const SINGLE_BET_SUB_TYPES: BetSubType[] = [
  {
    id: "moneyline",
    label: "Moneyline",
    display: "TO WIN",
    sports: ["mlb", "nfl", "nba", "nhl", "ncaaf", "ncaab", "mma", "boxing", "tennis", "golf", "other"],
  },
  {
    id: "spread",
    label: "Spread",
    display: "SPREAD",
    sports: ["mlb", "nfl", "nba", "nhl", "ncaaf", "ncaab", "other"],
  },
  {
    id: "over_under",
    label: "Over/Under",
    display: "TOTAL",
    sports: ["mlb", "nfl", "nba", "nhl", "ncaaf", "ncaab", "soccer", "mma", "boxing", "tennis", "other"],
  },
  {
    id: "total_corners",
    label: "Total Corners",
    display: "TOTAL CORNERS",
    sports: ["soccer"],
  },
  {
    id: "total_points",
    label: "Total Points",
    display: "TOTAL POINTS",
    sports: ["nfl", "nba", "ncaaf", "ncaab", "other"],
  },
  {
    id: "team_to_win",
    label: "Team To Win",
    display: "TO WIN",
    sports: ["mlb", "nfl", "nba", "nhl", "ncaaf", "ncaab", "soccer", "other"],
  },
  {
    id: "first_5_innings_total_runs",
    label: "1st 5 Innings Total Runs",
    display: "1ST 5 INNINGS TOTAL RUNS",
    sports: ["mlb"],
  },
  {
    id: "first_5_innings_total_spread",
    label: "1st 5 Innings Total Spread",
    display: "1ST 5 INNINGS TOTAL SPREAD",
    sports: ["mlb"],
  },
  {
    id: "inning_1_total_runs",
    label: "Inning 1 Total Runs",
    display: "INNING 1 TOTAL RUNS",
    sports: ["mlb"],
  },
  {
    id: "game_result_90_min",
    label: "Game Result (90 Min + Stoppage)",
    display: "GAME RESULT (90 MINUTES + STOPPAGE TIME)",
    sports: ["soccer"],
  },
];

// ────────────────────────────────────────
// Parlay Options
// ────────────────────────────────────────

export const PARLAY_OPTIONS: ParlayOption[] = [
  { id: "2-bet", label: "2-Bet Parlay", legs: 2 },
  { id: "3-bet", label: "3-Bet Parlay", legs: 3 },
  { id: "4-bet", label: "4-Bet Parlay", legs: 4 },
  { id: "5-bet", label: "5-Bet Parlay", legs: 5 },
  { id: "custom", label: "Custom Parlay", legs: "custom" },
];

// ────────────────────────────────────────
// Sport Metadata
// ────────────────────────────────────────

export const SPORTS: Record<Sport, { label: string; emoji: string }> = {
  mlb: { label: "MLB", emoji: "⚾" },
  nfl: { label: "NFL", emoji: "🏈" },
  nba: { label: "NBA", emoji: "🏀" },
  nhl: { label: "NHL", emoji: "🏒" },
  ncaaf: { label: "NCAAF", emoji: "🏈" },
  ncaab: { label: "NCAAB", emoji: "🏀" },
  soccer: { label: "Soccer", emoji: "⚽" },
  mma: { label: "MMA", emoji: "🥊" },
  boxing: { label: "Boxing", emoji: "🥊" },
  tennis: { label: "Tennis", emoji: "🎾" },
  golf: { label: "Golf", emoji: "⛳" },
  other: { label: "Other", emoji: "🎯" },
};

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

/**
 * Get available bet sub-types for a given sport.
 * If no sport is selected, returns all sub-types.
 */
export function getSubTypesForSport(sport?: Sport): BetSubType[] {
  if (!sport) return SINGLE_BET_SUB_TYPES;
  return SINGLE_BET_SUB_TYPES.filter((st) => st.sports.includes(sport));
}

/**
 * Get the number of legs for a parlay option.
 * Returns undefined for "custom" (user must specify).
 */
export function getParlayLegCount(parlayId: string): number | undefined {
  const option = PARLAY_OPTIONS.find((p) => p.id === parlayId);
  if (!option || option.legs === "custom") return undefined;
  return option.legs;
}

/**
 * Get display text for a bet sub-type ID.
 * Falls back to uppercased ID if not found.
 */
export function getDisplayForSubType(subTypeId: string): string {
  const found = SINGLE_BET_SUB_TYPES.find((st) => st.id === subTypeId);
  return found?.display ?? subTypeId.toUpperCase().replace(/_/g, " ");
}
