import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

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

    if (tab === "active") {
      const windowStart = getWindowStartUTC();
      const conditions = [
        eq(picks.status, "published"),
        gte(picks.publishedAt, windowStart),
      ];
      if (sport) conditions.push(eq(picks.sport, sport));

      const rows = await db
        .select()
        .from(picks)
        .where(and(...conditions))
        .orderBy(desc(picks.publishedAt));

      return NextResponse.json(rows);
    }

    if (tab === "settled") {
      const conditions = [eq(picks.status, "settled")];
      if (sport) conditions.push(eq(picks.sport, sport));

      const rows = await db
        .select()
        .from(picks)
        .where(and(...conditions))
        .orderBy(desc(picks.settledAt))
        .limit(100);

      return NextResponse.json(rows);
    }

    // tab === "all" (default fallback)
    const conditions = [];
    if (sport) conditions.push(eq(picks.sport, sport));

    const rows = await db
      .select()
      .from(picks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(picks.createdAt))
      .limit(100);

    return NextResponse.json(rows);
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
    const data = await req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(picks).values({
      id,
      sport: data.sport,
      league: data.league,
      matchup: data.matchup,
      pickText: data.pickText,
      gameDate: data.gameDate || now.split("T")[0],
      odds: data.odds || null,
      units: data.units || null,
      modelEdge: data.modelEdge || null,
      confidence: data.confidence || null,
      analysisEn: data.analysisEn,
      analysisEs: data.analysisEs,
      tier: data.tier || "vip",
      status: data.status || "draft",
      publishedAt: data.status === "published" ? now : null,
      settledAt: data.status === "settled" ? now : null,
      result: data.result || null,
      closingOdds: data.closingOdds || null,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create pick error:", error);
    return NextResponse.json(
      { error: "Failed to create pick" },
      { status: 500 }
    );
  }
}
