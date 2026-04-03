export interface TeamData {
  acronym: string;
  score: string;
  logoDataUrl?: string; // base64 data URL for team logo
}

export interface ParlayLeg {
  team1: TeamData;
  team2: TeamData;
  odds: string;
}

export type BetType = "Single" | "Parlay";

export interface BetFormData {
  betType: BetType;
  subBetType: string;
  betDescription: string;
  team1: TeamData;
  team2: TeamData;
  odds: string; // American odds for single bets
  wager: string; // raw number string, no $
  paid: string; // formatted with $
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
  subBetType: "moneyline",
  betDescription: "",
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
