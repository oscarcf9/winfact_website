/**
 * Recalculates the performanceCache table from settled picks.
 * Run after auto-settlement or manual settlement.
 */
import { db } from "@/db";
import { picks, performanceCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function refreshPerformanceCache() {
  const settled = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "settled"));

  if (settled.length === 0) return;

  // Calculate overall stats
  const overall = calcStats(settled);

  // Calculate per-sport stats
  const sportMap = new Map<string, typeof settled>();
  for (const p of settled) {
    if (!sportMap.has(p.sport)) sportMap.set(p.sport, []);
    sportMap.get(p.sport)!.push(p);
  }

  // Calculate monthly stats (overall)
  const monthMap = new Map<string, typeof settled>();
  for (const p of settled) {
    const month = (p.settledAt || p.publishedAt || p.createdAt || "").slice(0, 7); // "2026-03"
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(p);
  }

  // Clear and rebuild cache
  await db.delete(performanceCache);

  const rows: typeof performanceCache.$inferInsert[] = [];

  // Overall all-time
  rows.push({
    id: randomUUID(),
    scope: "overall",
    period: "all_time",
    ...overall,
    computedAt: new Date().toISOString(),
  });

  // Per-sport all-time
  for (const [sport, sportPicks] of sportMap) {
    rows.push({
      id: randomUUID(),
      scope: sport,
      period: "all_time",
      ...calcStats(sportPicks),
      computedAt: new Date().toISOString(),
    });
  }

  // Monthly overall
  for (const [month, monthPicks] of monthMap) {
    rows.push({
      id: randomUUID(),
      scope: "overall",
      period: month,
      ...calcStats(monthPicks),
      computedAt: new Date().toISOString(),
    });
  }

  // Insert all at once
  if (rows.length > 0) {
    await db.insert(performanceCache).values(rows);
  }
}

type PickRow = {
  result: string | null;
  units: number | null;
  clv: number | null;
};

function calcStats(picks: PickRow[]) {
  const wins = picks.filter((p) => p.result === "win").length;
  const losses = picks.filter((p) => p.result === "loss").length;
  const pushes = picks.filter((p) => p.result === "push").length;

  const unitsWon = picks.reduce((sum, p) => {
    if (p.result === "win") return sum + (p.units ?? 0);
    if (p.result === "loss") return sum - (p.units ?? 0);
    return sum;
  }, 0);

  const totalRisked = picks
    .filter((p) => p.result !== "push")
    .reduce((sum, p) => sum + (p.units ?? 0), 0);

  const roiPct = totalRisked > 0 ? (unitsWon / totalRisked) * 100 : 0;

  const clvPicks = picks.filter((p) => p.clv != null);
  const clvAvg = clvPicks.length > 0
    ? clvPicks.reduce((sum, p) => sum + (p.clv || 0), 0) / clvPicks.length
    : 0;

  return { wins, losses, pushes, unitsWon, roiPct, clvAvg };
}
