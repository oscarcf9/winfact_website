import type { SportId } from "./sport-config";

export interface TeamData {
  acronym: string;
  score: string;
  logoDataUrl?: string;
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
  matchup: string; // e.g., "Magic @ Cavaliers" — shown when no score bar
  teamName: string; // e.g., "Brewers" — for team-specific labels like "BREWERS TOTAL RUNS"
  team1: TeamData;
  team2: TeamData;
  odds: string;
  wager: string;
  paid: string;
  parlayLegs: ParlayLeg[];
  parlayLegCount: number;
}

export const DEFAULT_TEAM: TeamData = {
  acronym: "",
  score: "0",
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
};
