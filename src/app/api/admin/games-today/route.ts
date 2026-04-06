import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { gamesToday } from "@/db/schema";
import { eq, lt, gte, and, ne } from "drizzle-orm";
import { fetchOdds, SPORT_KEYS } from "@/lib/odds-api";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const sport = req.nextUrl.searchParams.get("sport");

    // Only return games from today onward (ET timezone — subtract 5h from UTC for safe cutoff)
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 5); // approximate ET offset
    cutoff.setHours(0, 0, 0, 0);
    const cutoffISO = cutoff.toISOString();

    const conditions = [
      // Only games with commence time >= start of today (ET-safe)
      gte(gamesToday.commenceTime, cutoffISO),
    ];
    if (sport) conditions.push(eq(gamesToday.sport, sport));

    const games = await db
      .select()
      .from(gamesToday)
      .where(and(...conditions))
      .orderBy(gamesToday.commenceTime);

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

    // Clean up old games (commenced before today) that don't have picks
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const oldGames = await db
      .select({ id: gamesToday.id })
      .from(gamesToday)
      .where(
        and(
          lt(gamesToday.commenceTime, todayStart.toISOString()),
          ne(gamesToday.pickStatus, "posted")
        )
      );

    for (const old of oldGames) {
      await db.delete(gamesToday).where(eq(gamesToday.id, old.id));
    }
    if (oldGames.length > 0) {
      console.log(`[refresh] Cleaned up ${oldGames.length} old games`);
    }

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

        // Extract odds from first bookmaker (consensus-like)
        const bk = event.bookmakers[0];
        const h2h = bk?.markets.find((m) => m.key === "h2h");
        const spreads = bk?.markets.find((m) => m.key === "spreads");
        const totals = bk?.markets.find((m) => m.key === "totals");

        const homeH2h = h2h?.outcomes.find((o) => o.name === event.home_team);
        const awayH2h = h2h?.outcomes.find((o) => o.name === event.away_team);
        const homeSpreadOutcome = spreads?.outcomes.find((o) => o.name === event.home_team);
        const overOutcome = totals?.outcomes.find((o) => o.name === "Over");
        const underOutcome = totals?.outcomes.find((o) => o.name === "Under");

        // Compute edge tier by comparing spreads across bookmakers
        let edgeTier: "strong" | "moderate" | "none" = "none";
        if (event.bookmakers.length >= 2) {
          const allSpreads = event.bookmakers
            .map((b) => {
              const sm = b.markets.find((m) => m.key === "spreads");
              const ho = sm?.outcomes.find((o) => o.name === event.home_team);
              return ho?.point;
            })
            .filter((p): p is number => p !== undefined);

          if (allSpreads.length >= 2) {
            const maxSpread = Math.max(...allSpreads);
            const minSpread = Math.min(...allSpreads);
            const diff = Math.abs(maxSpread - minSpread);

            if (diff >= 1.5) {
              edgeTier = "strong";
            } else if (diff >= 0.5) {
              edgeTier = "moderate";
            }
          }
        }

        const values = {
          sport: s,
          gameId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          homeOdds: homeH2h?.price ?? null,
          awayOdds: awayH2h?.price ?? null,
          homeSpread: homeSpreadOutcome?.point ?? null,
          totalLine: overOutcome?.point ?? null,
          overOdds: overOutcome?.price ?? null,
          underOdds: underOutcome?.price ?? null,
          edgeTier,
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
