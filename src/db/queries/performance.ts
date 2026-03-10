import { db } from "@/db";
import { performanceCache } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type PerformanceData = {
  scope: string;
  period: string;
  wins: number;
  losses: number;
  pushes: number;
  unitsWon: number;
  roiPct: number;
  clvAvg: number;
};

export async function getOverallPerformance(): Promise<PerformanceData | null> {
  const result = await db
    .select()
    .from(performanceCache)
    .where(
      and(
        eq(performanceCache.scope, "overall"),
        eq(performanceCache.period, "all_time")
      )
    )
    .limit(1);

  if (!result[0]) return null;
  const r = result[0];
  return {
    scope: r.scope,
    period: r.period,
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    pushes: r.pushes ?? 0,
    unitsWon: r.unitsWon ?? 0,
    roiPct: r.roiPct ?? 0,
    clvAvg: r.clvAvg ?? 0,
  };
}

export async function getSportPerformance(): Promise<PerformanceData[]> {
  const results = await db
    .select()
    .from(performanceCache)
    .where(eq(performanceCache.period, "all_time"));

  return results
    .filter((r) => r.scope !== "overall")
    .map((r) => ({
      scope: r.scope,
      period: r.period,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      pushes: r.pushes ?? 0,
      unitsWon: r.unitsWon ?? 0,
      roiPct: r.roiPct ?? 0,
      clvAvg: r.clvAvg ?? 0,
    }));
}

export async function getMonthlyPerformance(): Promise<PerformanceData[]> {
  const results = await db
    .select()
    .from(performanceCache)
    .where(eq(performanceCache.scope, "overall"));

  return results
    .filter((r) => r.period !== "all_time")
    .map((r) => ({
      scope: r.scope,
      period: r.period,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      pushes: r.pushes ?? 0,
      unitsWon: r.unitsWon ?? 0,
      roiPct: r.roiPct ?? 0,
      clvAvg: r.clvAvg ?? 0,
    }));
}

export async function getSportPerformanceByKey(
  sportKey: string
): Promise<PerformanceData | null> {
  const result = await db
    .select()
    .from(performanceCache)
    .where(
      and(
        eq(performanceCache.scope, sportKey),
        eq(performanceCache.period, "all_time")
      )
    )
    .limit(1);

  if (!result[0]) return null;
  const r = result[0];
  return {
    scope: r.scope,
    period: r.period,
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    pushes: r.pushes ?? 0,
    unitsWon: r.unitsWon ?? 0,
    roiPct: r.roiPct ?? 0,
    clvAvg: r.clvAvg ?? 0,
  };
}
