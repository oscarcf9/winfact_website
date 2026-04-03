import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { refreshPerformanceCache } from "@/lib/refresh-performance";
import { distributePickOnPublish } from "@/lib/delivery";
import { logAdminAction } from "@/lib/audit";
import { updatePickSchema } from "@/lib/validations";
import { queueVictoryPost } from "@/lib/victory-post-pipeline";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updatePickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const now = new Date().toISOString();

    // Get current pick to check status transitions
    const [current] = await db.select().from(picks).where(eq(picks.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Pick not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {
      sport: data.sport,
      league: data.league,
      matchup: data.matchup,
      pickText: data.pickText,
      gameDate: data.gameDate,
      odds: data.odds,
      units: data.units,
      modelEdge: data.modelEdge,
      confidence: data.confidence,
      stars: data.stars,
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

      // Queue victory post on manual win settle
      if (data.result === "win") {
        queueVictoryPost({
          id,
          sport: data.sport || current.sport,
          matchup: data.matchup || current.matchup,
          pickText: data.pickText || current.pickText,
          odds: data.odds ?? current.odds ?? null,
          units: data.units ?? current.units ?? null,
          tier: ((data.tier || current.tier || "free") as "free" | "vip"),
        }).catch((err) => console.error("[admin-picks] Victory post queue failed:", err));
      }
    }

    // Determine audit action based on status transition
    const auditAction = data.status === "settled" ? "pick_settled"
      : data.status === "published" && current.status !== "published" ? "pick_published"
      : "pick_updated";
    await logAdminAction({
      adminUserId: admin.userId,
      action: auditAction,
      targetType: "pick",
      targetId: id,
      details: {
        sport: data.sport,
        newStatus: data.status,
        previousStatus: current.status,
        ...(data.result ? { result: data.result } : {}),
      },
      request: req,
    });

    // Fire-and-forget distribution when publishing for the first time
    if (data.status === "published" && current.status !== "published" && data.distribute) {
      distributePickOnPublish(id, {
        sport: data.sport || current.sport,
        matchup: data.matchup || current.matchup,
        pickText: data.pickText || current.pickText,
        odds: data.odds ?? current.odds ?? null,
        units: data.units ?? current.units ?? null,
        confidence: data.confidence ?? current.confidence ?? null,
        stars: data.stars ?? current.stars ?? null,
        analysisEn: data.analysisEn ?? current.analysisEn ?? null,
        analysisEs: data.analysisEs ?? current.analysisEs ?? null,
        tier: data.tier || current.tier || "vip",
        modelEdge: data.modelEdge ?? current.modelEdge ?? null,
      }).catch((err) => console.error("Distribution failed (non-blocking):", err));
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

    await logAdminAction({
      adminUserId: admin.userId,
      action: "pick_deleted",
      targetType: "pick",
      targetId: id,
      request: req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete pick error:", error);
    return NextResponse.json({ error: "Failed to delete pick" }, { status: 500 });
  }
}
