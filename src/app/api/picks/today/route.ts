import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTodayPicks } from "@/db/queries/picks";
import { getActiveSubscription } from "@/db/queries/subscriptions";

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

    const isVip = subscription?.tier === "vip_weekly" || subscription?.tier === "vip_monthly";

    // Filter VIP picks for non-VIP users
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
      return { ...pick, locked: false };
    });

    return NextResponse.json({ picks: visiblePicks, count: visiblePicks.length });
  } catch (error) {
    console.error("Today picks API error:", error);
    return NextResponse.json({ error: "Failed to fetch picks" }, { status: 500 });
  }
}
