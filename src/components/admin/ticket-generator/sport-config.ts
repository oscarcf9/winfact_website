export interface BetSubType {
  id: string;
  label: string;
  display: string;
  /** Whether to show the score bar on the ticket. If false, shows matchup subtitle instead. */
  showScoreBar: boolean;
}

export interface ParlayOption {
  id: string;
  label: string;
  legs: number | "custom";
}

export const SINGLE_BET_SUB_TYPES: BetSubType[] = [
  // ── Full game bets (show score bar) ──
  { id: "moneyline", label: "Moneyline", display: "TO WIN", showScoreBar: true },
  { id: "spread", label: "Spread", display: "SPREAD", showScoreBar: true },
  { id: "over_under", label: "Over/Under", display: "TOTAL", showScoreBar: true },
  { id: "total_points", label: "Total Points", display: "TOTAL POINTS", showScoreBar: true },
  { id: "team_to_win", label: "Team To Win", display: "TO WIN", showScoreBar: true },

  // ── Half / Quarter props (no score bar, show matchup) ──
  { id: "first_half_spread", label: "1st Half Spread", display: "1ST HALF SPREAD", showScoreBar: false },
  { id: "second_half_spread", label: "2nd Half Spread", display: "2ND HALF SPREAD", showScoreBar: false },
  { id: "first_half_total", label: "1st Half Total Points", display: "1ST HALF TOTAL POINTS", showScoreBar: false },
  { id: "second_half_total", label: "2nd Half Total Points", display: "2ND HALF TOTAL POINTS", showScoreBar: false },
  { id: "first_quarter_total", label: "1st Quarter Total Points", display: "1ST QUARTER TOTAL POINTS", showScoreBar: false },
  { id: "second_quarter_total", label: "2nd Quarter Total Points", display: "2ND QUARTER TOTAL POINTS", showScoreBar: false },
  { id: "third_quarter_total", label: "3rd Quarter Total Points", display: "3RD QUARTER TOTAL POINTS", showScoreBar: false },
  { id: "fourth_quarter_total", label: "4th Quarter Total Points", display: "4TH QUARTER TOTAL POINTS", showScoreBar: false },

  // ── Soccer props ──
  { id: "total_corners", label: "Total Corners", display: "TOTAL CORNERS", showScoreBar: true },
  { id: "game_result_90_min", label: "Game Result (90 Min + Stoppage)", display: "GAME RESULT (90 MINUTES + STOPPAGE TIME)", showScoreBar: true },

  // ── MLB inning props (no score bar, show matchup) ──
  { id: "first_5_innings_total_runs", label: "1st 5 Innings Total Runs", display: "1ST 5 INNINGS TOTAL RUNS", showScoreBar: false },
  { id: "first_5_innings_total_spread", label: "1st 5 Innings Total Spread", display: "1ST 5 INNINGS TOTAL SPREAD", showScoreBar: false },
  { id: "inning_1_total_runs", label: "Inning 1 Total Runs", display: "INNING 1 TOTAL RUNS", showScoreBar: false },
];

export const PARLAY_OPTIONS: ParlayOption[] = [
  { id: "2-bet", label: "2-Bet Parlay", legs: 2 },
  { id: "3-bet", label: "3-Bet Parlay", legs: 3 },
  { id: "4-bet", label: "4-Bet Parlay", legs: 4 },
  { id: "5-bet", label: "5-Bet Parlay", legs: 5 },
  { id: "custom", label: "Custom Parlay", legs: "custom" },
];

export function getDisplayForSubType(subTypeId: string): string {
  const found = SINGLE_BET_SUB_TYPES.find((st) => st.id === subTypeId);
  return found?.display ?? subTypeId.toUpperCase().replace(/_/g, " ");
}

export function shouldShowScoreBar(subTypeId: string): boolean {
  const found = SINGLE_BET_SUB_TYPES.find((st) => st.id === subTypeId);
  return found?.showScoreBar ?? true;
}
