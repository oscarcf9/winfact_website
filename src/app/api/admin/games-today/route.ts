import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { gamesToday } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchOdds, SPORT_KEYS } from "@/lib/odds-api";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const sport = req.nextUrl.searchParams.get("sport");

    let games;
    if (sport) {
      games = await db.select().from(gamesToday).where(eq(gamesToday.sport, sport)).orderBy(gamesToday.commenceTime);
    } else {
      games = await db.select().from(gamesToday).orderBy(gamesToday.commenceTime);
    }

    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { sport } = await req.json();
    const sports = sport ? [sport] : Object.keys(SPORT_KEYS);
    let totalGames = 0;

    for (const s of sports) {
      const { events, error } = await fetchOdds(s, "h2h,spreads,totals");
      if (error) continue;

      for (const event of events) {
        const id = crypto.randomUUID();
        const existing = await db
          .select()
          .from(gamesToday)
          .where(eq(gamesToday.gameId, event.id))
          .then((r) => r[0]);

        const _h2hMarket = event.bookmakers[0]?.markets.find((m) => m.key === "h2h");
        const _spreadsMarket = event.bookmakers[0]?.markets.find((m) => m.key === "spreads");

        const values = {
          sport: s,
          gameId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          fetchedAt: new Date().toISOString(),
        };

        if (existing) {
          await db.update(gamesToday).set(values).where(eq(gamesToday.id, existing.id));
        } else {
          await db.insert(gamesToday).values({ id, ...values });
        }
        totalGames++;
      }
    }

    return NextResponse.json({ refreshed: totalGames });
  } catch (error) {
    console.error("Games refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh games" }, { status: 500 });
  }
}
