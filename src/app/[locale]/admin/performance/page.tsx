import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TrendingUp, Trophy, BarChart3, Percent, Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PerformanceCharts } from "@/components/admin/performance-charts";

export default async function AdminPerformancePage() {
  const t = await getTranslations("admin.performancePage");
  const ta = await getTranslations("admin.analytics");

  const settled = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "settled"));

  const wins = settled.filter((p) => p.result === "win").length;
  const losses = settled.filter((p) => p.result === "loss").length;
  const pushes = settled.filter((p) => p.result === "push").length;
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "\u2014";

  const unitsWon = settled.reduce((sum, p) => {
    if (p.result === "win") return sum + (p.units ?? 0);
    if (p.result === "loss") return sum - (p.units ?? 0);
    return sum;
  }, 0);

  const totalRisked = settled
    .filter((p) => p.result !== "push")
    .reduce((sum, p) => sum + (p.units ?? 0), 0);
  const roi = totalRisked > 0 ? ((unitsWon / totalRisked) * 100).toFixed(1) : "\u2014";

  const avgClv = settled.filter((p) => p.clv != null).length > 0
    ? (settled.reduce((sum, p) => sum + (p.clv || 0), 0) / settled.filter((p) => p.clv != null).length).toFixed(2)
    : "\u2014";

  const statCards = [
    { icon: Percent, value: `${winRate}%`, label: t("winRate"), accent: "from-primary to-primary" },
    { icon: Trophy, value: `${wins}-${losses}-${pushes}`, label: t("record"), accent: "from-accent to-accent" },
    { icon: TrendingUp, value: `${unitsWon >= 0 ? "+" : ""}${unitsWon.toFixed(1)}u`, label: t("unitsWon"), accent: unitsWon >= 0 ? "from-success to-success" : "from-danger to-danger" },
    { icon: BarChart3, value: `${roi}%`, label: t("roi"), accent: "from-warning to-warning" },
    { icon: Activity, value: `${avgClv}%`, label: t("avgClv"), accent: "from-primary to-accent" },
  ];

  // Serialize picks for client component
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
  }));

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
        <span className="text-primary">{t("title")}</span>
        <span className="text-gray-400 text-lg font-normal ml-3">{ta("advancedAnalytics")}</span>
      </h1>

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
      <PerformanceCharts picks={serializedPicks} />
    </div>
  );
}
