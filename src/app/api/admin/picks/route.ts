import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks, users, gamesToday } from "@/db/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import { distributePickOnPublish } from "@/lib/delivery";
import { logAdminAction } from "@/lib/audit";
import { createPickSchema } from "@/lib/validations";
import { runAutoBlog } from "@/lib/auto-blog";

/**
 * Calculate the start of the current 4 AM ET visibility window.
 * If before 4 AM ET → window started at 4 AM ET yesterday.
 * If at or after 4 AM ET → window started at 4 AM ET today.
 * Returns a UTC ISO string.
 *
 * Uses Intl.DateTimeFormat.formatToParts for correct ET extraction
 * regardless of server timezone (Vercel runs in UTC).
 */
function getWindowStartUTC(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0");

  const etYear = get("year");
  const etMonth = get("month") - 1;
  const etDay = get("day");
  const etHour = get("hour");

  // Determine which day's 4 AM to use
  let fourAMDay = etDay;
  if (etHour < 4) {
    fourAMDay -= 1; // Before 4 AM → use yesterday's 4 AM
  }

  // Build 4 AM ET as a Date in ET "wall clock" space
  // Then calculate the ET→UTC offset to convert
  const fourAMET = new Date(Date.UTC(etYear, etMonth, fourAMDay, 4, 0, 0, 0));

  // Get the offset: what UTC time corresponds to this ET wall-clock time?
  // ET is UTC-5 (EST) or UTC-4 (EDT). We find the offset by checking what
  // ET reads at a known UTC time near our target.
  const probe = new Date(Date.UTC(etYear, etMonth, fourAMDay, 12, 0, 0)); // noon UTC
  const probeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    hour12: false,
  });
  const probeHour = parseInt(probeFormatter.format(probe));
  const offsetHours = probeHour - 12; // e.g., EDT: 8-12 = -4, EST: 7-12 = -5

  // 4 AM ET in UTC = 4 AM - offset (offset is negative, so we add |offset|)
  const fourAMUTC = new Date(Date.UTC(etYear, etMonth, fourAMDay, 4 - offsetHours, 0, 0, 0));

  return fourAMUTC.toISOString();
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

    // Backlink to gamesToday record if this pick matches a game
    try {
      const allGames = await db.select().from(gamesToday).where(eq(gamesToday.sport, data.sport));
      const matchupLower = data.matchup.toLowerCase();
      const matchingGame = allGames.find((g) => {
        const gameMatchup = `${g.awayTeam} vs ${g.homeTeam}`.toLowerCase();
        const gameMatchupAlt = `${g.homeTeam} vs ${g.awayTeam}`.toLowerCase();
        return (
          (matchupLower.includes(g.homeTeam.toLowerCase()) && matchupLower.includes(g.awayTeam.toLowerCase()))
          || matchupLower === gameMatchup
          || matchupLower === gameMatchupAlt
        );
      });
      if (matchingGame) {
        await db.update(gamesToday).set({ pickStatus: "posted", pickId: id }).where(eq(gamesToday.id, matchingGame.id));
      }
    } catch (e) {
      console.error("Failed to update gamesToday backlink:", e);
    }

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

    // Auto-blog generation — fire-and-forget, never blocks pick creation.
    // Feature gate is evaluated inside runAutoBlog (env var + site_content).
    if (data.status === "published") {
      console.log(`[auto-blog] Triggering for pick ${id}: ${data.matchup}`);
      runAutoBlog({
        sport: data.sport,
        league: data.league || data.sport,
        matchup: data.matchup,
        pickText: data.pickText,
        gameDate: data.gameDate || null,
        odds: data.odds || null,
        units: data.units || null,
        confidence: data.confidence || data.stars || null,
        tier: data.tier || "vip",
        analysisEn: data.analysisEn || null,
        pickId: id,
      }).then((result) => {
        if (result.skipped) {
          console.log(`[auto-blog] Skipped for pick ${id}: ${result.reason}`);
        } else {
          console.log(`[auto-blog] Success: ${result.slug}, image: ${result.featuredImage ? "YES" : "NO"}`);
        }
      }).catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[auto-blog] trigger failed for pick " + id + ":", err);
        const { sendAdminNotification } = await import("@/lib/telegram");
        sendAdminNotification(
          `⚠️ Auto-blog trigger failed for pick ${id}\n${data.sport} · ${data.matchup}\nError: ${msg}`
        ).catch(() => {});
      });
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
