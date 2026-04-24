import { auth } from "@clerk/nextjs/server";
import { getSettledPicks } from "@/db/queries/picks";
import { getActiveSubscription } from "@/db/queries/subscriptions";
import { getLocale } from "next-intl/server";
import { PickHistory } from "@/components/dashboard/pick-history";
import { isVipTier } from "@/lib/constants";

export default async function PickHistoryPage() {
  const { userId } = await auth();
  const locale = await getLocale();

  const [allPicks, subscription] = await Promise.all([
    getSettledPicks({ limit: 500 }),
    userId ? getActiveSubscription(userId) : null,
  ]);

  const isVip = isVipTier(subscription?.tier);

  // Serialize for client component
  const serializedPicks = allPicks.map((p) => ({
    id: p.id,
    sport: p.sport,
    league: p.league,
    matchup: p.matchup,
    pickText: p.pickText,
    gameDate: p.gameDate,
    odds: p.odds,
    units: p.units,
    modelEdge: p.modelEdge,
    confidence: p.confidence as "top" | "strong" | "standard" | null,
    analysisEn: p.analysisEn,
    analysisEs: p.analysisEs,
    tier: p.tier as "free" | "vip" | null,
    status: p.status as "draft" | "published" | "settled" | null,
    result: p.result as "win" | "loss" | "push" | null,
    closingOdds: p.closingOdds,
    clv: p.clv,
    publishedAt: p.publishedAt,
    settledAt: p.settledAt,
    createdAt: p.createdAt,
    pickType: p.pickType as "single" | "parlay" | null,
    legCount: p.legCount,
    legs: p.legs?.map((l) => ({
      legIndex: l.legIndex,
      sport: l.sport,
      matchup: l.matchup,
      pickText: l.pickText,
      odds: l.odds,
      result: l.result as "win" | "loss" | "push" | "void" | null,
    })),
  }));

  return <PickHistory picks={serializedPicks} locale={locale} isVip={isVip} />;
}
