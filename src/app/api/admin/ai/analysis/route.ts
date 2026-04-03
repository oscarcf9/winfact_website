import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generatePickAnalysis, type PickContext } from "@/lib/ai-assistant";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();

    // Accept the full enrichment-aware context
    const context: PickContext = {
      sport: body.sport,
      matchup: body.matchup,
      gameTime: body.gameTime,
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      homeOdds: body.homeOdds,
      awayOdds: body.awayOdds,
      homeSpread: body.homeSpread,
      totalLine: body.totalLine,
      overOdds: body.overOdds,
      underOdds: body.underOdds,
      odds: body.odds,
      modelEdge: body.modelEdge,
      venue: body.venue,
      homeRecord: body.homeRecord,
      awayRecord: body.awayRecord,
      homeHomeRecord: body.homeHomeRecord,
      awayAwayRecord: body.awayAwayRecord,
      homeForm: body.homeForm,
      awayForm: body.awayForm,
      injuries: body.injuries,
      starters: body.starters,
      teamStats: body.teamStats,
      bookmakerComparison: body.bookmakerComparison,
      headlines: body.headlines,
      sharpAction: body.sharpAction,
      lineHistory: body.lineHistory,
      capperNotes: body.capperNotes,
      betTypePreference: body.betTypePreference,
    };

    const result = await generatePickAnalysis(context);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
