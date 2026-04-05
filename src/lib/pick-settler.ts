/**
 * Pick result evaluator — determines win/loss/push from game scores.
 */

import { type ESPNGame } from "./espn";
import { parsePick, teamsMatch } from "./team-normalizer";

export type SettlementResult = {
  result: "win" | "loss" | "push" | "pending" | "manual_review";
  confidence: "high" | "low";
  reason: string;
};

type SettleInput = {
  pickText: string;
  sport: string;
  game: ESPNGame;
};

/**
 * Evaluate a pick against a finished game.
 */
export function evaluatePick(input: SettleInput): SettlementResult {
  const { pickText, sport, game } = input;

  if (game.status !== "post") {
    return { result: "pending", confidence: "high", reason: "Game not yet final" };
  }

  const parsed = parsePick(pickText);

  if (parsed.betType === "parlay") {
    return { result: "manual_review", confidence: "high", reason: "Parlays require manual review" };
  }

  if (parsed.betType === "player_prop") {
    return { result: "manual_review", confidence: "high", reason: "Player props require manual review" };
  }

  if (parsed.betType === "unknown") {
    return { result: "manual_review", confidence: "low", reason: `Could not parse pick: "${pickText}"` };
  }

  // Determine which scores to use based on period
  const scores = getScoresForPeriod(parsed.betType, game);
  if (!scores) {
    return {
      result: "manual_review",
      confidence: "low",
      reason: "Period scores not available for this game",
    };
  }

  const { homeScore, awayScore } = scores;
  const baseType = getBaseType(parsed.betType);

  // --- Moneyline ---
  if (baseType === "moneyline") {
    if (!parsed.team) {
      return { result: "manual_review", confidence: "low", reason: "No team found in pick text" };
    }

    const pickedHome = teamsMatch(parsed.team, game.homeTeam, sport);
    const pickedAway = teamsMatch(parsed.team, game.awayTeam, sport);

    if (!pickedHome && !pickedAway) {
      return {
        result: "manual_review",
        confidence: "low",
        reason: `Could not match "${parsed.team}" to ${game.homeTeam} or ${game.awayTeam}`,
      };
    }

    const pickedTeamScore = pickedHome ? homeScore : awayScore;
    const opponentScore = pickedHome ? awayScore : homeScore;

    if (pickedTeamScore > opponentScore) {
      return { result: "win", confidence: "high", reason: `${parsed.team} won ${pickedTeamScore}-${opponentScore}` };
    } else if (pickedTeamScore < opponentScore) {
      return { result: "loss", confidence: "high", reason: `${parsed.team} lost ${pickedTeamScore}-${opponentScore}` };
    } else {
      return { result: "push", confidence: "high", reason: `Game tied ${pickedTeamScore}-${opponentScore}` };
    }
  }

  // --- Spread ---
  if (baseType === "spread") {
    if (!parsed.team || parsed.line == null) {
      return { result: "manual_review", confidence: "low", reason: "Missing team or spread line" };
    }

    const pickedHome = teamsMatch(parsed.team, game.homeTeam, sport);
    const pickedAway = teamsMatch(parsed.team, game.awayTeam, sport);

    if (!pickedHome && !pickedAway) {
      return {
        result: "manual_review",
        confidence: "low",
        reason: `Could not match "${parsed.team}" to ${game.homeTeam} or ${game.awayTeam}`,
      };
    }

    const pickedTeamScore = pickedHome ? homeScore : awayScore;
    const opponentScore = pickedHome ? awayScore : homeScore;
    const margin = pickedTeamScore - opponentScore;
    const adjustedMargin = margin + parsed.line; // line is negative for favorites

    if (adjustedMargin > 0) {
      return { result: "win", confidence: "high", reason: `${parsed.team} ${parsed.line > 0 ? "+" : ""}${parsed.line}: margin ${margin}, covers by ${adjustedMargin}` };
    } else if (adjustedMargin < 0) {
      return { result: "loss", confidence: "high", reason: `${parsed.team} ${parsed.line > 0 ? "+" : ""}${parsed.line}: margin ${margin}, fails by ${Math.abs(adjustedMargin)}` };
    } else {
      return { result: "push", confidence: "high", reason: `${parsed.team} ${parsed.line > 0 ? "+" : ""}${parsed.line}: exact push (margin ${margin})` };
    }
  }

  // --- Over ---
  if (baseType === "over") {
    if (parsed.line == null) {
      return { result: "manual_review", confidence: "low", reason: "Missing total line" };
    }

    const total = homeScore + awayScore;
    if (total > parsed.line) {
      return { result: "win", confidence: "high", reason: `Total ${total} > ${parsed.line} (Over)` };
    } else if (total < parsed.line) {
      return { result: "loss", confidence: "high", reason: `Total ${total} < ${parsed.line} (Over)` };
    } else {
      return { result: "push", confidence: "high", reason: `Total ${total} = ${parsed.line} (exact push)` };
    }
  }

  // --- Under ---
  if (baseType === "under") {
    if (parsed.line == null) {
      return { result: "manual_review", confidence: "low", reason: "Missing total line" };
    }

    const total = homeScore + awayScore;
    if (total < parsed.line) {
      return { result: "win", confidence: "high", reason: `Total ${total} < ${parsed.line} (Under)` };
    } else if (total > parsed.line) {
      return { result: "loss", confidence: "high", reason: `Total ${total} > ${parsed.line} (Under)` };
    } else {
      return { result: "push", confidence: "high", reason: `Total ${total} = ${parsed.line} (exact push)` };
    }
  }

  return { result: "manual_review", confidence: "low", reason: `Unhandled bet type: ${parsed.betType}` };
}

/** Extract base bet type without period prefix */
function getBaseType(betType: string): string {
  return betType.replace(/^(f5_|1h_|1q_|1i_)/, "");
}

/** Get the relevant scores for the bet period */
function getScoresForPeriod(
  betType: string,
  game: ESPNGame
): { homeScore: number; awayScore: number } | null {
  // Full game
  if (!betType.startsWith("f5_") && !betType.startsWith("1h_") && !betType.startsWith("1q_") && !betType.startsWith("1i_")) {
    return { homeScore: game.homeScore, awayScore: game.awayScore };
  }

  // First 5 innings (MLB)
  if (betType.startsWith("f5_")) {
    if (game.homeLinescores.length < 5 || game.awayLinescores.length < 5) return null;
    const homeF5 = game.homeLinescores.slice(0, 5).reduce((a, b) => a + b, 0);
    const awayF5 = game.awayLinescores.slice(0, 5).reduce((a, b) => a + b, 0);
    return { homeScore: homeF5, awayScore: awayF5 };
  }

  // First half (NBA: Q1+Q2, NFL: Q1+Q2, NHL: P1+P2)
  if (betType.startsWith("1h_")) {
    if (game.homeLinescores.length < 2 || game.awayLinescores.length < 2) return null;
    const homeH1 = game.homeLinescores.slice(0, 2).reduce((a, b) => a + b, 0);
    const awayH1 = game.awayLinescores.slice(0, 2).reduce((a, b) => a + b, 0);
    return { homeScore: homeH1, awayScore: awayH1 };
  }

  // First quarter (NBA, NFL)
  if (betType.startsWith("1q_")) {
    if (game.homeLinescores.length < 1 || game.awayLinescores.length < 1) return null;
    return { homeScore: game.homeLinescores[0], awayScore: game.awayLinescores[0] };
  }

  // First inning (MLB)
  if (betType.startsWith("1i_")) {
    if (game.homeLinescores.length < 1 || game.awayLinescores.length < 1) return null;
    return { homeScore: game.homeLinescores[0], awayScore: game.awayLinescores[0] };
  }

  return null;
}
