// ── Sport definitions with SVG icon paths ──

export type SportId = "nfl" | "mlb" | "nba" | "nhl" | "soccer" | "ncaaf" | "ncaab";

export interface Sport {
  id: SportId;
  label: string;
  emoji: string;
  subTypes: string[];
}

export const SPORTS: Sport[] = [
  {
    id: "nfl", label: "NFL", emoji: "\uD83C\uDFC8",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "second_half_spread", "first_half_total", "second_half_total", "first_quarter_total", "second_quarter_total", "third_quarter_total", "fourth_quarter_total"],
  },
  {
    id: "mlb", label: "MLB", emoji: "\u26BE",
    subTypes: ["moneyline", "spread", "total_runs", "total_runs_team", "total_points", "total_points_team", "first_5_innings_total_runs", "first_5_innings_total_spread", "inning_1_total_runs"],
  },
  {
    id: "nba", label: "NBA", emoji: "\uD83C\uDFC0",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "second_half_spread", "first_half_total", "second_half_total", "first_quarter_total", "second_quarter_total", "third_quarter_total", "fourth_quarter_total"],
  },
  {
    id: "nhl", label: "NHL", emoji: "\uD83C\uDFD2",
    subTypes: ["moneyline", "spread"],
  },
  {
    id: "soccer", label: "Soccer", emoji: "\u26BD",
    subTypes: ["moneyline", "total_corners", "total_corners_team", "game_result_90_min"],
  },
  {
    id: "ncaaf", label: "NCAAF", emoji: "\uD83C\uDFC8",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "first_half_total"],
  },
  {
    id: "ncaab", label: "NCAAB", emoji: "\uD83C\uDFC0",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "first_half_total"],
  },
];

// ── Bet sub-type definitions ──

export interface BetSubType {
  id: string;
  label: string;
  display: string;
  showScoreBar: boolean;
  /** If true, the bet type label on the ticket will be "{TEAM_NAME} {display}" */
  hasTeamPrefix: boolean;
}

export const SINGLE_BET_SUB_TYPES: BetSubType[] = [
  // ── Full game bets (show score bar) ──
  { id: "moneyline", label: "Moneyline", display: "TO WIN", showScoreBar: true, hasTeamPrefix: false },
  { id: "spread", label: "Spread", display: "SPREAD", showScoreBar: true, hasTeamPrefix: false },
  { id: "over_under", label: "Over/Under", display: "TOTAL", showScoreBar: true, hasTeamPrefix: false },
  { id: "total_points", label: "Total Points", display: "TOTAL POINTS", showScoreBar: true, hasTeamPrefix: false },
  { id: "team_to_win", label: "Team To Win", display: "TO WIN", showScoreBar: true, hasTeamPrefix: false },

  // ── Team-specific props (show score bar, team name prefix) ──
  { id: "total_runs_team", label: "Total Runs (Team)", display: "TOTAL RUNS", showScoreBar: true, hasTeamPrefix: true },
  { id: "total_points_team", label: "Total Points (Team)", display: "TOTAL POINTS", showScoreBar: true, hasTeamPrefix: true },
  { id: "total_corners_team", label: "Total Corners (Team)", display: "TOTAL CORNERS", showScoreBar: true, hasTeamPrefix: true },

  // ── Generic props without score bar ──
  { id: "total_runs", label: "Total Runs", display: "TOTAL RUNS", showScoreBar: false, hasTeamPrefix: false },

  // ── Half / Quarter props (no score bar, show matchup) ──
  { id: "first_half_spread", label: "1st Half Spread", display: "1ST HALF SPREAD", showScoreBar: false, hasTeamPrefix: false },
  { id: "second_half_spread", label: "2nd Half Spread", display: "2ND HALF SPREAD", showScoreBar: false, hasTeamPrefix: false },
  { id: "first_half_total", label: "1st Half Total Points", display: "1ST HALF TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },
  { id: "second_half_total", label: "2nd Half Total Points", display: "2ND HALF TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },
  { id: "first_quarter_total", label: "1st Quarter Total Points", display: "1ST QUARTER TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },
  { id: "second_quarter_total", label: "2nd Quarter Total Points", display: "2ND QUARTER TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },
  { id: "third_quarter_total", label: "3rd Quarter Total Points", display: "3RD QUARTER TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },
  { id: "fourth_quarter_total", label: "4th Quarter Total Points", display: "4TH QUARTER TOTAL POINTS", showScoreBar: false, hasTeamPrefix: false },

  // ── Soccer props ──
  { id: "total_corners", label: "Total Corners", display: "TOTAL CORNERS", showScoreBar: true, hasTeamPrefix: false },
  { id: "game_result_90_min", label: "Game Result (90 Min + Stoppage)", display: "GAME RESULT (90 MINUTES + STOPPAGE TIME)", showScoreBar: true, hasTeamPrefix: false },

  // ── MLB inning props (no score bar, show matchup) ──
  { id: "first_5_innings_total_runs", label: "1st 5 Innings Total Runs", display: "1ST 5 INNINGS TOTAL RUNS", showScoreBar: false, hasTeamPrefix: false },
  { id: "first_5_innings_total_spread", label: "1st 5 Innings Total Spread", display: "1ST 5 INNINGS TOTAL SPREAD", showScoreBar: false, hasTeamPrefix: false },
  { id: "inning_1_total_runs", label: "Inning 1 Total Runs", display: "INNING 1 TOTAL RUNS", showScoreBar: false, hasTeamPrefix: false },
];

export interface ParlayOption {
  id: string;
  label: string;
  legs: number | "custom";
}

export const PARLAY_OPTIONS: ParlayOption[] = [
  { id: "2-bet", label: "2-Bet Parlay", legs: 2 },
  { id: "3-bet", label: "3-Bet Parlay", legs: 3 },
  { id: "4-bet", label: "4-Bet Parlay", legs: 4 },
  { id: "5-bet", label: "5-Bet Parlay", legs: 5 },
  { id: "custom", label: "Custom Parlay", legs: "custom" },
];

// ── Helpers ──

export function getSubType(id: string): BetSubType | undefined {
  return SINGLE_BET_SUB_TYPES.find((st) => st.id === id);
}

export function getDisplayForSubType(subTypeId: string, teamName?: string): string {
  const found = getSubType(subTypeId);
  if (!found) return subTypeId.toUpperCase().replace(/_/g, " ");
  if (found.hasTeamPrefix && teamName) {
    return `${teamName.toUpperCase()} ${found.display}`;
  }
  return found.display;
}

export function shouldShowScoreBar(subTypeId: string): boolean {
  return getSubType(subTypeId)?.showScoreBar ?? true;
}

export function hasTeamPrefix(subTypeId: string): boolean {
  return getSubType(subTypeId)?.hasTeamPrefix ?? false;
}

export function getSubTypesForSport(sportId: SportId): BetSubType[] {
  const sport = SPORTS.find((s) => s.id === sportId);
  if (!sport) return SINGLE_BET_SUB_TYPES;
  return SINGLE_BET_SUB_TYPES.filter((st) => sport.subTypes.includes(st.id));
}
