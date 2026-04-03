// ── Sport definitions with SVG icon paths ──

export type SportId = "nfl" | "mlb" | "nba" | "nhl" | "soccer" | "ncaaf" | "ncaab" | "mma" | "tennis" | "golf";

export interface Sport {
  id: SportId;
  label: string;
  /** SVG path data for a compact icon (24x24 viewBox) */
  iconPath: string;
  subTypes: string[]; // IDs of available sub-types for this sport
}

export const SPORTS: Sport[] = [
  {
    id: "nfl",
    label: "NFL",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "second_half_spread", "first_half_total", "second_half_total", "first_quarter_total", "second_quarter_total", "third_quarter_total", "fourth_quarter_total"],
  },
  {
    id: "mlb",
    label: "MLB",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM5.61 16.78C4.6 15.45 4 13.8 4 12s.6-3.45 1.61-4.78a7.12 7.12 0 010 9.56zM12 20c-1.8 0-3.45-.6-4.78-1.61a7.12 7.12 0 019.56 0C15.45 19.4 13.8 20 12 20zm6.39-3.22a7.12 7.12 0 010-9.56C19.4 8.55 20 10.2 20 12s-.6 3.45-1.61 4.78zM12 4c1.8 0 3.45.6 4.78 1.61a7.12 7.12 0 01-9.56 0C8.55 4.6 10.2 4 12 4z",
    subTypes: ["moneyline", "spread", "total_runs", "total_runs_team", "total_points", "total_points_team", "first_5_innings_total_runs", "first_5_innings_total_spread", "inning_1_total_runs"],
  },
  {
    id: "nba",
    label: "NBA",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.33 0 2.57.36 3.65.97L12 8.59 8.35 4.97A7.93 7.93 0 0112 4zm-8 8c0-1.33.36-2.57.97-3.65L8.59 12l-3.62 3.65A7.93 7.93 0 014 12zm8 8c-1.33 0-2.57-.36-3.65-.97L12 15.41l3.65 3.62A7.93 7.93 0 0112 20zm0-6.83L8.83 12 12 8.83 15.17 12 12 13.17zM19.03 15.65L15.41 12l3.62-3.65c.61 1.08.97 2.32.97 3.65s-.36 2.57-.97 3.65z",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "second_half_spread", "first_half_total", "second_half_total", "first_quarter_total", "second_quarter_total", "third_quarter_total", "fourth_quarter_total"],
  },
  {
    id: "nhl",
    label: "NHL",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-10a2 2 0 110-4 2 2 0 010 4zm4 0a2 2 0 110-4 2 2 0 010 4zm-2 7c2.21 0 4-1.34 4-3h-8c0 1.66 1.79 3 4 3z",
    subTypes: ["moneyline", "spread"],
  },
  {
    id: "soccer",
    label: "Soccer",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 2.07c3.07.38 5.57 2.52 6.54 5.36L16 11.71 13 9.33V4.07zM4.46 9.43C5.43 6.59 7.93 4.45 11 4.07v5.26L8 11.71 4.46 9.43zm.08 5.14L8 12.31l2 1.44v3.56l-2.54 1.85c-1.73-1.13-2.89-2.87-2.92-4.59zM12 20c-.78 0-1.53-.11-2.25-.32L12 17.95l2.25 1.73c-.72.21-1.47.32-2.25.32zm4.54-2.84L14 15.31v-3.56l2-1.44 3.46 2.26c-.03 1.72-1.19 3.46-2.92 4.59z",
    subTypes: ["moneyline", "total_corners", "total_corners_team", "game_result_90_min"],
  },
  {
    id: "ncaaf",
    label: "NCAAF",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    subTypes: ["moneyline", "spread", "total_points", "first_half_spread", "first_half_total"],
  },
  {
    id: "ncaab",
    label: "NCAAB",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.33 0 2.57.36 3.65.97L12 8.59 8.35 4.97A7.93 7.93 0 0112 4zm-8 8c0-1.33.36-2.57.97-3.65L8.59 12l-3.62 3.65A7.93 7.93 0 014 12zm8 8c-1.33 0-2.57-.36-3.65-.97L12 15.41l3.65 3.62A7.93 7.93 0 0112 20zm0-6.83L8.83 12 12 8.83 15.17 12 12 13.17zM19.03 15.65L15.41 12l3.62-3.65c.61 1.08.97 2.32.97 3.65s-.36 2.57-.97 3.65z",
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
