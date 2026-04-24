import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSettledPicks } from "@/db/queries/picks";
import { requireVip } from "@/lib/vip-auth";

/** Public-safe fields for pick history responses. */
const PUBLIC_PICK_FIELDS = [
  "id", "sport", "league", "matchup", "pickText", "gameDate", "odds", "units",
  "confidence", "analysisEn", "analysisEs", "tier", "status", "result",
  "publishedAt", "settledAt", "pickType", "legCount",
] as const;

const PUBLIC_LEG_FIELDS = [
  "legIndex", "sport", "matchup", "pickText", "odds", "result",
] as const;

function sanitizeLegs(legs: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(legs)) return null;
  return legs.map((leg: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {};
    for (const key of PUBLIC_LEG_FIELDS) {
      if (key in leg) clean[key] = leg[key];
    }
    return clean;
  });
}

function sanitizePick(pick: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const key of PUBLIC_PICK_FIELDS) {
    if (key in pick) clean[key] = pick[key];
  }
  if (pick.pickType === "parlay") {
    clean.legs = sanitizeLegs(pick.legs);
  }
  return clean;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const sport = searchParams.get("sport") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const { isVip } = await requireVip(userId);
    const allPicks = await getSettledPicks({ sport, limit });

    // Non-VIP users only see free-tier settled picks
    const picks = isVip
      ? allPicks.map(sanitizePick)
      : allPicks.filter((p) => p.tier === "free").map(sanitizePick);

    return NextResponse.json({ picks, count: picks.length });
  } catch (error) {
    console.error("Pick history API error:", error);
    return NextResponse.json({ error: "Failed to fetch pick history" }, { status: 500 });
  }
}
