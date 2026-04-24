import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks, parlayLegs } from "@/db/schema";
import { distributePickOnPublish } from "@/lib/delivery";
import { logAdminAction } from "@/lib/audit";
import { createPicksBatchSchema } from "@/lib/validations";
import { calculateParlayOdds } from "@/lib/parlay-odds";

/**
 * Batch create multiple picks (any mix of singles + parlays) in one request.
 * Each pick is inserted independently; failures in distribution are reported
 * per-pick but never block sibling inserts.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const parsed = createPicksBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { picks: items, distribute: batchDistribute } = parsed.data;
    const results: Array<{
      id: string;
      ok: boolean;
      distributed?: boolean;
      error?: string;
    }> = [];

    for (const data of items) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      try {
        const isParlay = data.pickType === "parlay" && data.legs && data.legs.length >= 2;
        const legs = isParlay ? data.legs! : [];

        const computedOdds = isParlay
          ? (data.odds ?? calculateParlayOdds(legs.map((l) => l.odds ?? null)))
          : (data.odds ?? null);

        const sportDisplay = isParlay
          ? (Array.from(new Set(legs.map((l) => l.sport))).length === 1
              ? legs[0].sport
              : "Multi")
          : data.sport;
        const matchupDisplay = isParlay ? `${legs.length}-Leg Parlay` : data.matchup;
        const pickTextDisplay = isParlay
          ? legs
              .map((l) => `${l.pickText}${l.odds != null ? ` (${l.odds > 0 ? "+" : ""}${l.odds})` : ""}`)
              .join(" + ")
          : data.pickText;

        await db.insert(picks).values({
          id,
          sport: sportDisplay,
          league: data.league || null,
          matchup: matchupDisplay,
          pickText: pickTextDisplay.slice(0, 500),
          gameDate: data.gameDate || now.split("T")[0],
          odds: computedOdds,
          units: data.units || null,
          modelEdge: data.modelEdge || null,
          confidence: data.confidence || null,
          stars: data.stars || null,
          analysisEn: data.analysisEn || null,
          analysisEs: data.analysisEs || null,
          tier: data.tier || "vip",
          pickType: isParlay ? "parlay" : "single",
          legCount: isParlay ? legs.length : null,
          status: data.status || "published",
          publishedAt: (data.status || "published") === "published" ? now : null,
          capperId: admin.userId,
        });

        if (isParlay) {
          await db.insert(parlayLegs).values(
            legs.map((leg, idx) => ({
              id: crypto.randomUUID(),
              pickId: id,
              legIndex: idx,
              sport: leg.sport,
              league: leg.league || null,
              matchup: leg.matchup,
              pickText: leg.pickText,
              gameDate: leg.gameDate || data.gameDate || now.split("T")[0],
              odds: leg.odds ?? null,
              result: null,
            }))
          );
        }

        const shouldDistribute =
          (data.status || "published") === "published" &&
          (data.distribute ?? batchDistribute ?? true);

        let distributed = false;
        if (shouldDistribute) {
          try {
            await distributePickOnPublish(id, {
              sport: sportDisplay,
              matchup: matchupDisplay,
              pickText: pickTextDisplay,
              odds: computedOdds,
              units: data.units || null,
              confidence: data.confidence || null,
              stars: data.stars || null,
              analysisEn: data.analysisEn || null,
              analysisEs: data.analysisEs || null,
              tier: data.tier || "vip",
              modelEdge: data.modelEdge || null,
              pickType: isParlay ? "parlay" : "single",
              legs: isParlay
                ? legs.map((l) => ({
                    sport: l.sport,
                    matchup: l.matchup,
                    pickText: l.pickText,
                    odds: l.odds ?? null,
                  }))
                : undefined,
            });
            distributed = true;
          } catch (err) {
            console.error(`[picks/batch] distribution failed for ${id}:`, err);
          }
        }

        results.push({ id, ok: true, distributed });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[picks/batch] insert failed:`, err);
        results.push({ id, ok: false, error: msg });
      }
    }

    await logAdminAction({
      adminUserId: admin.userId,
      action: "picks_batch_created",
      targetType: "pick",
      details: {
        total: results.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
      request: req,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Batch create picks error:", error);
    return NextResponse.json({ error: "Failed to create picks" }, { status: 500 });
  }
}
