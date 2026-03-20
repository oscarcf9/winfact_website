import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTodayPicks } from "@/db/queries/picks";
import { getActiveSubscription } from "@/db/queries/subscriptions";
import { isVipTier } from "@/lib/constants";

/** Public-safe fields included in subscriber-facing pick responses. */
function sanitizePick(pick: Record<string, unknown>) {
  return {
    id: pick.id,
    sport: pick.sport,
    league: pick.league,
    matchup: pick.matchup,
    pickText: pick.pickText,
    gameDate: pick.gameDate,
    odds: pick.odds,
    units: pick.units,
    confidence: pick.confidence,
    analysisEn: pick.analysisEn,
    analysisEs: pick.analysisEs,
    tier: pick.tier,
    status: pick.status,
    result: pick.result,
    publishedAt: pick.publishedAt,
    settledAt: pick.settledAt,
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [picks, subscription] = await Promise.all([
      getTodayPicks(),
      getActiveSubscription(userId),
    ]);

    const isVip = isVipTier(subscription?.tier);

    // Filter VIP picks for non-VIP users, sanitize all responses
    const visiblePicks = picks.map((pick) => {
      if (pick.tier === "vip" && !isVip) {
        return {
          id: pick.id,
          sport: pick.sport,
          matchup: pick.matchup,
          tier: pick.tier,
          confidence: pick.confidence,
          publishedAt: pick.publishedAt,
          locked: true,
        };
      }
      return { ...sanitizePick(pick), locked: false };
    });

    return NextResponse.json({ picks: visiblePicks, count: visiblePicks.length });
  } catch (error) {
    console.error("Today picks API error:", error);
    return NextResponse.json({ error: "Failed to fetch picks" }, { status: 500 });
  }
}
