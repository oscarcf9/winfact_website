import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateWeeklyRecap } from "@/lib/ai-assistant";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recentPicks = await db
      .select()
      .from(picks)
      .where(eq(picks.status, "settled"))
      .then((all) => all.filter((p) => p.settledAt && p.settledAt >= sevenDaysAgo));

    const result = await generateWeeklyRecap(
      recentPicks.map((p) => ({
        sport: p.sport,
        matchup: p.matchup,
        pickText: p.pickText,
        result: p.result || "push",
        units: p.units ?? 0,
      }))
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Recap generation failed" }, { status: 500 });
  }
}
