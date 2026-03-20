import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchEventSummary } from "@/lib/espn";
import { fetchOdds, SPORT_KEYS } from "@/lib/odds-api";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/games/detail?league=NBA&eventId=401234567
 *
 * Returns detailed game data from ESPN + odds from The Odds API.
 * Requires authenticated user (member or admin).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await rateLimit(req, { prefix: "game-detail", maxRequests: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = req.nextUrl;
  const league = searchParams.get("league");
  const eventId = searchParams.get("eventId");
  const homeTeam = searchParams.get("homeTeam") || "";
  const awayTeam = searchParams.get("awayTeam") || "";

  if (!league || !eventId) {
    return NextResponse.json(
      { error: "league and eventId are required" },
      { status: 400 }
    );
  }

  // Fetch ESPN event summary and odds in parallel
  const [summary, oddsResult] = await Promise.all([
    fetchEventSummary(league, eventId),
    getOddsForGame(league, homeTeam, awayTeam),
  ]);

  return NextResponse.json({
    summary,
    odds: oddsResult,
  });
}

// Map league names to the sport keys used by The Odds API
const LEAGUE_TO_SPORT: Record<string, string> = {
  NBA: "NBA",
  MLB: "MLB",
  NFL: "NFL",
  NHL: "NHL",
  MLS: "Soccer",
  "Premier League": "Soccer",
  "La Liga": "Soccer",
  "Serie A": "Soccer",
  Bundesliga: "Soccer",
  "Champions League": "Soccer",
  "Liga MX": "Soccer",
  NCAAF: "NCAA",
  NCAAB: "NCAA",
};

async function getOddsForGame(
  league: string,
  homeTeam: string,
  awayTeam: string
) {
  const sport = LEAGUE_TO_SPORT[league];
  if (!sport || !SPORT_KEYS[sport]) return null;

  try {
    const { events, error } = await fetchOdds(sport, "h2h,spreads,totals");
    if (error || events.length === 0) return null;

    // Find the matching event by team names
    const normalizeTeam = (name: string) =>
      name.toLowerCase().replace(/[^a-z]/g, "");
    const home = normalizeTeam(homeTeam);
    const away = normalizeTeam(awayTeam);

    const match = events.find((e) => {
      const eHome = normalizeTeam(e.home_team);
      const eAway = normalizeTeam(e.away_team);
      return (
        (eHome.includes(home) || home.includes(eHome)) &&
        (eAway.includes(away) || away.includes(eAway))
      );
    });

    if (!match) return null;

    // Format bookmaker odds for display
    const bookmakers = match.bookmakers.map((bk) => ({
      name: bk.title,
      markets: Object.fromEntries(
        bk.markets.map((m) => [
          m.key,
          m.outcomes.map((o) => ({
            name: o.name,
            price: o.price,
            point: o.point,
          })),
        ])
      ),
    }));

    return {
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      commenceTime: match.commence_time,
      bookmakers,
    };
  } catch {
    return null;
  }
}
