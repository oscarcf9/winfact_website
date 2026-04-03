import type { SportId } from "./sport-config";

export interface TeamData {
  acronym: string;
  score: string;
  logoDataUrl?: string;
}

export interface QuarterScore {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  ot?: string;
  total: string;
}

export interface BoxScoreData {
  enabled: boolean;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Quarters: QuarterScore;
  team2Quarters: QuarterScore;
  periods: number; // 4 for NBA/NFL, 3 for NHL, 9 for MLB
}

export interface ParlayLeg {
  team1: TeamData;
  team2: TeamData;
  odds: string;
}

export type BetType = "Single" | "Parlay";

export interface BetFormData {
  betType: BetType;
  sport: SportId;
  subBetType: string;
  betDescription: string;
  matchup: string;
  teamName: string;
  customBetTypeLabel: string; // Free-text override for bet type display
  team1: TeamData;
  team2: TeamData;
  odds: string;
  wager: string;
  paid: string;
  parlayLegs: ParlayLeg[];
  parlayLegCount: number;
  // Box score
  boxScore: BoxScoreData;
  // Links
  pickId: string;
  gameUrl: string;
}

export const DEFAULT_TEAM: TeamData = {
  acronym: "",
  score: "0",
};

export const DEFAULT_QUARTER_SCORE: QuarterScore = {
  q1: "", q2: "", q3: "", q4: "", total: "",
};

export const DEFAULT_BOX_SCORE: BoxScoreData = {
  enabled: false,
  team1Name: "",
  team2Name: "",
  team1Quarters: { ...DEFAULT_QUARTER_SCORE },
  team2Quarters: { ...DEFAULT_QUARTER_SCORE },
  periods: 4,
};

export const DEFAULT_PARLAY_LEG: ParlayLeg = {
  team1: { ...DEFAULT_TEAM },
  team2: { ...DEFAULT_TEAM },
  odds: "",
};

export const INITIAL_FORM_DATA: BetFormData = {
  betType: "Single",
  sport: "nfl",
  subBetType: "moneyline",
  betDescription: "",
  matchup: "",
  teamName: "",
  customBetTypeLabel: "",
  team1: { ...DEFAULT_TEAM },
  team2: { ...DEFAULT_TEAM },
  odds: "",
  wager: "",
  paid: "$0.00",
  parlayLegs: [
    { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
    { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
  ],
  parlayLegCount: 2,
  boxScore: { ...DEFAULT_BOX_SCORE },
  pickId: "",
  gameUrl: "",
};

// ── Template Presets ──

export interface TicketPreset {
  name: string;
  emoji: string;
  data: Partial<BetFormData>;
}

export const TICKET_PRESETS: TicketPreset[] = [
  {
    name: "MLB Moneyline",
    emoji: "\u26BE",
    data: { sport: "mlb", subBetType: "moneyline", betDescription: "Cardinals", odds: "-145" },
  },
  {
    name: "NBA Spread",
    emoji: "\uD83C\uDFC0",
    data: { sport: "nba", subBetType: "spread", betDescription: "Knicks -6.5", odds: "-110" },
  },
  {
    name: "NFL Total",
    emoji: "\uD83C\uDFC8",
    data: { sport: "nfl", subBetType: "total_points", betDescription: "Over 47.5", odds: "-110" },
  },
  {
    name: "Soccer Corners",
    emoji: "\u26BD",
    data: { sport: "soccer", subBetType: "total_corners_team", betDescription: "Over 3.5", odds: "-150", teamName: "Benfica" },
  },
  {
    name: "MLB Total Runs",
    emoji: "\u26BE",
    data: { sport: "mlb", subBetType: "total_runs_team", betDescription: "Over 4.5", odds: "-130", teamName: "Brewers" },
  },
  {
    name: "NBA 1H Spread",
    emoji: "\uD83C\uDFC0",
    data: { sport: "nba", subBetType: "first_half_spread", betDescription: "Nuggets -1.5", odds: "-135", matchup: "Nuggets @ Suns" },
  },
  {
    name: "MLB 1st Inning",
    emoji: "\u26BE",
    data: { sport: "mlb", subBetType: "inning_1_total_runs", betDescription: "Under 0.5", odds: "-125", matchup: "Twins @ Orioles" },
  },
  {
    name: "NHL Moneyline",
    emoji: "\uD83C\uDFD2",
    data: { sport: "nhl", subBetType: "moneyline", betDescription: "Maple Leafs", odds: "+130" },
  },
];
