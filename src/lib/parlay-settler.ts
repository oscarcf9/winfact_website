/**
 * Parlay settler — evaluates each leg of a parlay against ESPN scoreboards,
 * persists per-leg results, and computes the overall parlay result.
 *
 * Rules:
 *   - Any leg = loss  → parlay = loss
 *   - All legs = win  → parlay = win
 *   - Mix of win + push (no loss, no pending) → parlay = win
 *     (sportsbooks treat push legs as voids and drop them from the parlay)
 *   - Any leg pending/manual_review → parlay = pending (leave unsettled)
 */
import { db } from "@/db";
import { parlayLegs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { fetchScoreboard } from "./espn";
import { evaluatePick } from "./pick-settler";
import { teamsMatch } from "./team-normalizer";
import type { ESPNGame } from "./espn";

type LegRow = typeof parlayLegs.$inferSelect;

export type ParlaySettlementResult = {
  overall: "win" | "loss" | "push" | "pending";
  reason: string;
  legStatuses: Array<{
    legIndex: number;
    result: "win" | "loss" | "push" | "pending";
    reason: string;
  }>;
};

function findGameForLeg(leg: LegRow, games: ESPNGame[]): ESPNGame | undefined {
  const parts = leg.matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i);
  if (parts.length < 2) return undefined;
  const [team1, team2] = parts.map((p) => p.trim());

  const exact: ESPNGame[] = [];
  for (const game of games) {
    const m1h = teamsMatch(team1, game.homeTeam, leg.sport);
    const m1a = teamsMatch(team1, game.awayTeam, leg.sport);
    const m2h = teamsMatch(team2, game.homeTeam, leg.sport);
    const m2a = teamsMatch(team2, game.awayTeam, leg.sport);
    if ((m1h && m2a) || (m1a && m2h)) exact.push(game);
  }
  return exact.length === 1 ? exact[0] : undefined;
}

export async function settleParlay(
  pickId: string,
  scoreboardCache: Map<string, ESPNGame[]>
): Promise<ParlaySettlementResult> {
  const legs = await db
    .select()
    .from(parlayLegs)
    .where(eq(parlayLegs.pickId, pickId))
    .orderBy(asc(parlayLegs.legIndex));

  if (legs.length === 0) {
    return { overall: "pending", reason: "No legs found", legStatuses: [] };
  }

  const legStatuses: ParlaySettlementResult["legStatuses"] = [];
  let anyLoss = false;
  let anyPending = false;
  let wins = 0;
  let pushes = 0;

  for (const leg of legs) {
    // Skip legs already marked with a final result
    if (leg.result && leg.result !== "void") {
      legStatuses.push({
        legIndex: leg.legIndex,
        result: leg.result as "win" | "loss" | "push",
        reason: "Already settled",
      });
      if (leg.result === "loss") anyLoss = true;
      else if (leg.result === "win") wins++;
      else if (leg.result === "push") pushes++;
      continue;
    }

    const gameDate = (leg.gameDate || "").replace(/-/g, "");
    if (!gameDate) {
      legStatuses.push({ legIndex: leg.legIndex, result: "pending", reason: "No game date" });
      anyPending = true;
      continue;
    }

    const key = `${leg.sport}|${gameDate}`;
    let games = scoreboardCache.get(key);
    if (!games) {
      try {
        games = await fetchScoreboard(leg.sport, gameDate);
        scoreboardCache.set(key, games);
      } catch (err) {
        legStatuses.push({
          legIndex: leg.legIndex,
          result: "pending",
          reason: `ESPN fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        anyPending = true;
        continue;
      }
    }

    const game = findGameForLeg(leg, games);
    if (!game) {
      legStatuses.push({ legIndex: leg.legIndex, result: "pending", reason: "Game not found" });
      anyPending = true;
      continue;
    }
    if (game.status !== "post") {
      legStatuses.push({ legIndex: leg.legIndex, result: "pending", reason: `Game not final: ${game.statusDetail}` });
      anyPending = true;
      continue;
    }

    const verdict = evaluatePick({ pickText: leg.pickText, sport: leg.sport, game });
    if (verdict.confidence !== "high" || verdict.result === "pending" || verdict.result === "manual_review") {
      legStatuses.push({ legIndex: leg.legIndex, result: "pending", reason: verdict.reason });
      anyPending = true;
      continue;
    }

    // Persist leg result
    await db
      .update(parlayLegs)
      .set({
        result: verdict.result,
        settledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(parlayLegs.id, leg.id));

    legStatuses.push({
      legIndex: leg.legIndex,
      result: verdict.result as "win" | "loss" | "push",
      reason: verdict.reason,
    });

    if (verdict.result === "loss") anyLoss = true;
    else if (verdict.result === "win") wins++;
    else if (verdict.result === "push") pushes++;
  }

  // Determine overall result
  if (anyLoss) {
    return { overall: "loss", reason: "At least one leg lost", legStatuses };
  }
  if (anyPending) {
    return { overall: "pending", reason: "Some legs not yet final", legStatuses };
  }
  if (wins + pushes === legs.length) {
    // If all legs pushed → parlay pushes (no movement)
    if (wins === 0) {
      return { overall: "push", reason: "All legs pushed", legStatuses };
    }
    return { overall: "win", reason: `All non-push legs won (${wins}W/${pushes}P)`, legStatuses };
  }

  return { overall: "pending", reason: "Unknown state", legStatuses };
}
