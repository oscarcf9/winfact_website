import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks, users } from "@/db/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import { distributePickOnPublish } from "@/lib/delivery";
import { logAdminAction } from "@/lib/audit";
import { createPickSchema } from "@/lib/validations";

/**
 * Calculate the start of the current 4 AM ET visibility window.
 * If before 4 AM ET → window started at 4 AM ET yesterday.
 * If at or after 4 AM ET → window started at 4 AM ET today.
 * Returns a UTC ISO string.
 */
function getWindowStartUTC(): string {
  const nowET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  // Build a Date whose component values represent 4 AM ET today
  const fourAM = new Date(nowET);
  fourAM.setHours(4, 0, 0, 0);

  // If we haven't reached 4 AM ET yet, roll back to yesterday
  if (nowET < fourAM) {
    fourAM.setDate(fourAM.getDate() - 1);
  }

  // Determine the ET → UTC offset so we can convert
  const tempUTC = new Date(
    Date.UTC(
      fourAM.getFullYear(),
      fourAM.getMonth(),
      fourAM.getDate(),
      fourAM.getHours(),
      fourAM.getMinutes()
    )
  );
  const tempET = new Date(
    tempUTC.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const offsetMs = tempET.getTime() - tempUTC.getTime();

  // Place the ET clock values into UTC positions, then shift by offset
  const realUTC = new Date(
    Date.UTC(
      fourAM.getFullYear(),
      fourAM.getMonth(),
      fourAM.getDate(),
      fourAM.getHours(),
      fourAM.getMinutes()
    )
  );
  realUTC.setTime(realUTC.getTime() + offsetMs);

  return realUTC.toISOString();
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { searchParams } = req.nextUrl;
    const tab = searchParams.get("tab") || "active";
    const sport = searchParams.get("sport");
    const capperId = searchParams.get("capperId");

    let rows;

    if (tab === "active") {
      const windowStart = getWindowStartUTC();
      const conditions = [
        eq(picks.status, "published"),
        gte(picks.publishedAt, windowStart),
      ];
      if (sport) conditions.push(eq(picks.sport, sport));
      if (capperId) conditions.push(eq(picks.capperId, capperId));

      rows = await db
        .select()
        .from(picks)
        .where(and(...conditions))
        .orderBy(desc(picks.publishedAt));
    } else if (tab === "settled") {
      const conditions = [eq(picks.status, "settled")];
      if (sport) conditions.push(eq(picks.sport, sport));
      if (capperId) conditions.push(eq(picks.capperId, capperId));

      rows = await db
        .select()
        .from(picks)
        .where(and(...conditions))
        .orderBy(desc(picks.settledAt))
        .limit(1000);
    } else {
      // tab === "all" (default fallback)
      const conditions = [];
      if (sport) conditions.push(eq(picks.sport, sport));
      if (capperId) conditions.push(eq(picks.capperId, capperId));

      rows = await db
        .select()
        .from(picks)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(picks.createdAt))
        .limit(1000);
    }

    // Attach capper names (query only relevant users, not the entire table)
    const capperIds = [...new Set(rows.map((r) => r.capperId).filter(Boolean))] as string[];
    let capperMap: Map<string, string> = new Map();
    if (capperIds.length > 0) {
      const cappers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, capperIds));
      capperMap = new Map(
        cappers.map((c) => [c.id, c.name || c.email])
      );
    }

    const enriched = rows.map((r) => ({
      ...r,
      capperName: r.capperId ? capperMap.get(r.capperId) || null : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get picks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch picks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const parsed = createPickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(picks).values({
      id,
      sport: data.sport,
      league: data.league || null,
      matchup: data.matchup,
      pickText: data.pickText,
      gameDate: data.gameDate || now.split("T")[0],
      odds: data.odds || null,
      units: data.units || null,
      modelEdge: data.modelEdge || null,
      confidence: data.confidence || null,
      stars: data.stars || null,
      analysisEn: data.analysisEn || null,
      analysisEs: data.analysisEs || null,
      tier: data.tier || "vip",
      status: data.status || "draft",
      publishedAt: data.status === "published" ? now : null,
      settledAt: data.status === "settled" ? now : null,
      result: data.result || null,
      closingOdds: data.closingOdds || null,
      capperId: admin.userId,
    });

    await logAdminAction({
      adminUserId: admin.userId,
      action: "pick_created",
      targetType: "pick",
      targetId: id,
      details: { sport: data.sport, matchup: data.matchup, tier: data.tier, status: data.status },
      request: req,
    });

    // Distribute if requested — await so we can report status, but never block save
    let distributed = false;
    let distributionError: string | null = null;

    if (data.status === "published" && data.distribute) {
      try {
        await distributePickOnPublish(id, {
          sport: data.sport,
          matchup: data.matchup,
          pickText: data.pickText,
          odds: data.odds || null,
          units: data.units || null,
          confidence: data.confidence || null,
          stars: data.stars || null,
          analysisEn: data.analysisEn || null,
          analysisEs: data.analysisEs || null,
          tier: data.tier || "vip",
          modelEdge: data.modelEdge || null,
        });
        distributed = true;
      } catch (err) {
        distributionError = err instanceof Error ? err.message : String(err);
        console.error("Distribution failed (pick still saved):", err);
      }
    }

    // Auto-blog generation — fire-and-forget, never blocks pick creation
    // Disabled by default. Set ENABLE_AUTO_BLOG=true in env to enable.
    if (data.status === "published" && process.env.ENABLE_AUTO_BLOG === "true") {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        console.log(`[auto-blog] Triggering for pick ${id}: ${data.matchup}`);
        fetch(`${siteUrl}/api/admin/auto-blog`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: data.sport,
            league: data.league || data.sport,
            matchup: data.matchup,
            pickText: data.pickText,
            gameDate: data.gameDate || null,
            odds: data.odds || null,
            units: data.units || null,
            stars: data.stars || null,
            tier: data.tier || "vip",
            analysisEn: data.analysisEn || null,
          }),
        }).catch((err) => {
          console.error("[auto-blog] Failed to trigger:", err);
        });
      } catch (err) {
        console.error("[auto-blog] Error:", err);
      }
    }

    return NextResponse.json({ id, distributed, distributionError });
  } catch (error) {
    console.error("Create pick error:", error);
    return NextResponse.json(
      { error: "Failed to create pick" },
      { status: 500 }
    );
  }
}
