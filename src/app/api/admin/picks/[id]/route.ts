import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refreshPerformanceCache } from "@/lib/refresh-performance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    const data = await req.json();
    const now = new Date().toISOString();

    // Get current pick to check status transitions
    const [current] = await db.select().from(picks).where(eq(picks.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Pick not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {
      sport: data.sport,
      league: data.league,
      matchup: data.matchup,
      pickText: data.pickText,
      odds: data.odds,
      units: data.units,
      modelEdge: data.modelEdge,
      confidence: data.confidence,
      analysisEn: data.analysisEn,
      analysisEs: data.analysisEs,
      tier: data.tier,
      status: data.status,
      updatedAt: now,
    };

    // If publishing for the first time
    if (data.status === "published" && current.status !== "published") {
      updateData.publishedAt = now;
    }

    // If settling
    if (data.status === "settled") {
      updateData.result = data.result;
      updateData.closingOdds = data.closingOdds;
      updateData.settledAt = now;

      // Auto-calculate CLV if closing odds provided
      if (data.closingOdds && current.odds) {
        const openProb = current.odds < 0
          ? Math.abs(current.odds) / (Math.abs(current.odds) + 100)
          : 100 / (current.odds + 100);
        const closeProb = data.closingOdds < 0
          ? Math.abs(data.closingOdds) / (Math.abs(data.closingOdds) + 100)
          : 100 / (data.closingOdds + 100);
        updateData.clv = Number(((closeProb - openProb) * 100).toFixed(2));
      }
    }

    await db.update(picks).set(updateData).where(eq(picks.id, id));

    // Refresh performance cache when settling a pick
    if (data.status === "settled") {
      await refreshPerformanceCache();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update pick error:", error);
    return NextResponse.json({ error: "Failed to update pick" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    await db.delete(picks).where(eq(picks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete pick error:", error);
    return NextResponse.json({ error: "Failed to delete pick" }, { status: 500 });
  }
}
