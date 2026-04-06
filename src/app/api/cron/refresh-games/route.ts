import { NextResponse } from "next/server";
import { db } from "@/db";
import { gamesToday } from "@/db/schema";
import { eq, lt, and, ne } from "drizzle-orm";
import { fetchOdds, SPORT_KEYS } from "@/lib/odds-api";

/**
 * GET /api/cron/refresh-games
 *
 * Daily cron job that refreshes today's games from The Odds API.
 * Runs at 8 AM and 12 PM ET to catch early + afternoon line releases.
 * Cleans up stale games from previous days.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clean up old games (commenced before today ET) that don't have picks
    // Use ET-safe cutoff: subtract 5h from UTC to approximate ET, then midnight
    const todayStart = new Date();
    todayStart.setHours(todayStart.getHours() - 5); // approximate ET
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

    // Fetch today's games for all sports
    const sports = Object.keys(SPORT_KEYS);
    let totalGames = 0;

    for (const s of sports) {
      const { events, error } = await fetchOdds(s, "h2h,spreads,totals");
      if (error) {
        console.log(`[refresh-games] ${s}: ${error}`);
        continue;
      }

      for (const event of events) {
        const id = crypto.randomUUID();
        const existing = await db
          .select()
          .from(gamesToday)
          .where(eq(gamesToday.gameId, event.id))
          .then((r) => r[0]);

        const bk = event.bookmakers[0];
        const h2h = bk?.markets.find((m) => m.key === "h2h");
        const spreads = bk?.markets.find((m) => m.key === "spreads");
        const totals = bk?.markets.find((m) => m.key === "totals");

        const homeH2h = h2h?.outcomes.find((o) => o.name === event.home_team);
        const awayH2h = h2h?.outcomes.find((o) => o.name === event.away_team);
        const homeSpreadOutcome = spreads?.outcomes.find((o) => o.name === event.home_team);
        const overOutcome = totals?.outcomes.find((o) => o.name === "Over");
        const underOutcome = totals?.outcomes.find((o) => o.name === "Under");

        // Compute edge tier
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
            const diff = Math.abs(Math.max(...allSpreads) - Math.min(...allSpreads));
            if (diff >= 1.5) edgeTier = "strong";
            else if (diff >= 0.5) edgeTier = "moderate";
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

    console.log(`[refresh-games] Done: ${totalGames} games refreshed, ${oldGames.length} old games cleaned`);
    return NextResponse.json({ refreshed: totalGames, cleaned: oldGames.length });
  } catch (error) {
    console.error("[refresh-games] Error:", error);
    return NextResponse.json({ error: "Failed to refresh games" }, { status: 500 });
  }
}
