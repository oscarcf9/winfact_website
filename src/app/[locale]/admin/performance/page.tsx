import { db } from "@/db";
import { picks, users, performanceCache } from "@/db/schema";
import { eq, and, ne, sql, inArray } from "drizzle-orm";
import { TrendingUp, Trophy, BarChart3, Percent, Activity, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PerformanceCharts } from "@/components/admin/performance-charts";
import { refreshPerformanceCache } from "@/lib/refresh-performance";
import { RefreshCacheButton } from "./refresh-cache-button";

export default async function AdminPerformancePage() {
  const t = await getTranslations("admin.performancePage");
  const ta = await getTranslations("admin.analytics");

  // Try to read from cache first
  let [overallCache] = await db
    .select()
    .from(performanceCache)
    .where(and(eq(performanceCache.scope, "overall"), eq(performanceCache.period, "all_time")));

  // If cache is empty, populate it from raw picks
  if (!overallCache) {
    await refreshPerformanceCache();
    [overallCache] = await db
      .select()
      .from(performanceCache)
      .where(and(eq(performanceCache.scope, "overall"), eq(performanceCache.period, "all_time")));
  }

  const wins = overallCache?.wins ?? 0;
  const losses = overallCache?.losses ?? 0;
  const pushes = overallCache?.pushes ?? 0;
  const unitsWon = overallCache?.unitsWon ?? 0;
  const roiPct = overallCache?.roiPct ?? 0;
  const clvAvg = overallCache?.clvAvg ?? 0;
  const computedAt = overallCache?.computedAt ?? null;

  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "\u2014";
  const roi = roiPct !== 0 ? roiPct.toFixed(1) : "\u2014";
  const avgClv = clvAvg !== 0 ? clvAvg.toFixed(2) : "\u2014";

  const statCards = [
    { icon: Percent, value: `${winRate}%`, label: t("winRate"), accent: "from-primary to-primary" },
    { icon: Trophy, value: `${wins}-${losses}-${pushes}`, label: t("record"), accent: "from-accent to-accent" },
    { icon: TrendingUp, value: `${unitsWon >= 0 ? "+" : ""}${unitsWon.toFixed(1)}u`, label: t("unitsWon"), accent: unitsWon >= 0 ? "from-success to-success" : "from-danger to-danger" },
    { icon: BarChart3, value: `${roi}%`, label: t("roi"), accent: "from-warning to-warning" },
    { icon: Activity, value: `${avgClv}%`, label: t("avgClv"), accent: "from-primary to-accent" },
  ];

  // Still need raw settled picks for the PerformanceCharts client component
  // (charts need individual pick data for filtering, time series, etc.)
  const settled = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "settled"));

  // Get capper names for attribution (query only relevant users)
  const capperIds = [...new Set(settled.map((p) => p.capperId).filter(Boolean))] as string[];
  let capperMap: Map<string, string> = new Map();
  if (capperIds.length > 0) {
    const cappers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, capperIds));
    capperMap = new Map(
      cappers.map((c) => [c.id, c.name || c.email])
    );
  }

  const capperList = Array.from(capperMap.entries()).map(([id, name]) => ({ id, name }));

  const serializedPicks = settled.map((p) => ({
    id: p.id,
    sport: p.sport,
    league: p.league,
    matchup: p.matchup,
    pickText: p.pickText,
    gameDate: p.gameDate,
    odds: p.odds,
    units: p.units,
    confidence: p.confidence,
    tier: p.tier,
    result: p.result,
    clv: p.clv,
    publishedAt: p.publishedAt,
    settledAt: p.settledAt,
    createdAt: p.createdAt,
    capperId: p.capperId,
    capperName: p.capperId ? capperMap.get(p.capperId) || null : null,
  }));

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          {" "}
          <span className="text-gray-400 text-lg font-normal ml-3">{ta("advancedAnalytics")}</span>
        </h1>
        <div className="flex items-center gap-3">
          {computedAt && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              Last refreshed: {new Date(computedAt).toLocaleString()}
            </div>
          )}
          <RefreshCacheButton />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:bg-gray-100 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className="font-mono text-2xl font-bold text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts & Analytics */}
      <PerformanceCharts picks={serializedPicks} cappers={capperList} />
    </div>
  );
}
