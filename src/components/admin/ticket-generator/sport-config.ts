export interface BetSubType {
  id: string;
  label: string;
  display: string;
}

export interface ParlayOption {
  id: string;
  label: string;
  legs: number | "custom";
}

export const SINGLE_BET_SUB_TYPES: BetSubType[] = [
  { id: "moneyline", label: "Moneyline", display: "TO WIN" },
  { id: "spread", label: "Spread", display: "SPREAD" },
  { id: "over_under", label: "Over/Under", display: "TOTAL" },
  { id: "total_corners", label: "Total Corners", display: "TOTAL CORNERS" },
  { id: "total_points", label: "Total Points", display: "TOTAL POINTS" },
  { id: "team_to_win", label: "Team To Win", display: "TO WIN" },
  { id: "first_5_innings_total_runs", label: "1st 5 Innings Total Runs", display: "1ST 5 INNINGS TOTAL RUNS" },
  { id: "first_5_innings_total_spread", label: "1st 5 Innings Total Spread", display: "1ST 5 INNINGS TOTAL SPREAD" },
  { id: "inning_1_total_runs", label: "Inning 1 Total Runs", display: "INNING 1 TOTAL RUNS" },
  { id: "game_result_90_min", label: "Game Result (90 Min + Stoppage)", display: "GAME RESULT (90 MINUTES + STOPPAGE TIME)" },
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
