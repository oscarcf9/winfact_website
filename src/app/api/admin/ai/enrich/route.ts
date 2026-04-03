import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { gamesToday } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchEventSummary, fetchScoreboard, toESPNDate, SPORT_PATHS } from "@/lib/espn";
import { fetchOdds, SPORT_KEYS } from "@/lib/odds-api";

/**
 * POST /api/admin/ai/enrich
 *
 * Auto-fetches ESPN event summary + fresh odds for a single game.
 * Called when the admin clicks "Analyze" on a game row.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { gameId } = await req.json();
    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    // Get the game from DB
    const [game] = await db
      .select()
      .from(gamesToday)
      .where(eq(gamesToday.id, gameId))
      .limit(1);

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    console.log(`[enrich] Game: ${game.awayTeam} vs ${game.homeTeam} (${game.sport})`);

    const espnLeague = game.sport;
    const hasESPN = !!SPORT_PATHS[espnLeague];
    console.log(`[enrich] ESPN lookup: hasESPN=${hasESPN}, league=${espnLeague}`);

    // Fetch ESPN data and fresh odds in parallel
    const [espnSummary, oddsResult] = await Promise.all([
      hasESPN ? findESPNEvent(espnLeague, game.homeTeam, game.awayTeam) : Promise.resolve(null),
      getFreshOdds(game.sport, game.homeTeam, game.awayTeam),
    ]);

    console.log(`[enrich] ESPN result: ${espnSummary ? `found (${espnSummary.homeTeam.record || "no record"})` : "null"}`);
    console.log(`[enrich] Odds result: ${oddsResult ? `${oddsResult.bookmakers.length} bookmakers` : "null"}`);

    // Build enrichment response
    const enrichment: Record<string, unknown> = {
      gameId: game.id,
      sport: game.sport,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      commenceTime: game.commenceTime,
      venue: espnSummary?.venue || game.venue || null,
      venueCity: espnSummary?.venueCity || null,
      broadcast: espnSummary?.broadcast || null,

      // Team records from ESPN
      homeRecord: espnSummary?.homeTeam.record || null,
      awayRecord: espnSummary?.awayTeam.record || null,
      homeHomeRecord: espnSummary?.homeTeam.homeRecord || null,
      awayAwayRecord: espnSummary?.awayTeam.awayRecord || null,

      // Recent form from ESPN
      homeForm: espnSummary?.homeTeam.recentForm || [],
      awayForm: espnSummary?.awayTeam.recentForm || [],

      // Injuries from ESPN
      homeInjuries: espnSummary?.homeInjuries || [],
      awayInjuries: espnSummary?.awayInjuries || [],

      // Headlines from ESPN
      headlines: espnSummary?.headlines || [],

      // Odds — from DB (cached) plus fresh from API
      cachedOdds: {
        homeOdds: game.homeOdds,
        awayOdds: game.awayOdds,
        homeSpread: game.homeSpread,
        totalLine: game.totalLine,
        overOdds: game.overOdds,
        underOdds: game.underOdds,
        edgeTier: game.edgeTier,
      },

      // Fresh odds from multiple bookmakers
      bookmakers: oddsResult?.bookmakers || [],

      // Best available lines (computed from fresh bookmakers)
      bestLines: oddsResult ? computeBestLines(oddsResult.bookmakers, game.homeTeam) : null,

      // Sharp action from DB
      sharpAction: game.sharpAction ? safeJSON(game.sharpAction) : null,

      // Debug info (for troubleshooting)
      _debug: {
        espnFound: !!espnSummary,
        oddsFound: !!oddsResult,
        oddsBookmakers: oddsResult?.bookmakers.length || 0,
        dbOddsPresent: game.homeOdds != null,
      },
    };

    return NextResponse.json(enrichment);
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json({ error: "Failed to enrich game data" }, { status: 500 });
  }
}

/**
 * Search ESPN scoreboard for a matching game and fetch its summary.
 */
async function findESPNEvent(league: string, homeTeam: string, awayTeam: string) {
  try {
    const date = toESPNDate();
    const scoreboard = await fetchScoreboard(league, date);
    console.log(`[enrich:espn] Scoreboard for ${league} on ${date}: ${scoreboard.length} games`);

    if (scoreboard.length === 0) return null;

    const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
    const home = normalizeTeam(homeTeam);
    const away = normalizeTeam(awayTeam);

    // Log first few games to debug matching
    console.log(`[enrich:espn] Looking for: home="${homeTeam}" (${home}), away="${awayTeam}" (${away})`);
    scoreboard.slice(0, 3).forEach((g) => {
      console.log(`[enrich:espn]   Game: ${g.awayTeam} at ${g.homeTeam} (h=${normalizeTeam(g.homeTeam)}, a=${normalizeTeam(g.awayTeam)})`);
    });

    const match = scoreboard.find((g) => {
      const h = normalizeTeam(g.homeTeam);
      const a = normalizeTeam(g.awayTeam);
      return (h.includes(home) || home.includes(h)) && (a.includes(away) || away.includes(a));
    });

    if (!match) {
      console.log(`[enrich:espn] No match found in ${scoreboard.length} games`);
      return null;
    }

    console.log(`[enrich:espn] Matched ESPN event: ${match.id} (${match.awayTeam} at ${match.homeTeam})`);
    return await fetchEventSummary(league, match.id);
  } catch (error) {
    console.error("[enrich:espn] Error:", error);
    return null;
  }
}

type BookmakerData = {
  name: string;
  markets: Record<string, { name: string; price: number; point?: number }[]>;
};

/**
 * Fetch fresh odds from The Odds API for a specific game.
 */
async function getFreshOdds(sport: string, homeTeam: string, awayTeam: string) {
  if (!SPORT_KEYS[sport]) {
    console.log(`[enrich:odds] Unknown sport key: "${sport}"`);
    return null;
  }

  try {
    const { events, error } = await fetchOdds(sport, "h2h,spreads,totals");
    console.log(`[enrich:odds] Fetched ${events.length} events for ${sport}${error ? ` (error: ${error})` : ""}`);

    if (error || events.length === 0) return null;

    const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
    const home = normalizeTeam(homeTeam);
    const away = normalizeTeam(awayTeam);

    const match = events.find((e) => {
      const eHome = normalizeTeam(e.home_team);
      const eAway = normalizeTeam(e.away_team);
      return (eHome.includes(home) || home.includes(eHome)) && (eAway.includes(away) || away.includes(eAway));
    });

    if (!match) {
      console.log(`[enrich:odds] No team match for ${homeTeam} vs ${awayTeam} in ${events.length} events`);
      // Log a few events to debug
      events.slice(0, 3).forEach((e) => {
        console.log(`[enrich:odds]   Event: ${e.away_team} at ${e.home_team}`);
      });
      return null;
    }

    console.log(`[enrich:odds] Matched: ${match.away_team} at ${match.home_team}, ${match.bookmakers.length} bookmakers`);

    const bookmakers: BookmakerData[] = match.bookmakers.map((bk) => ({
      name: bk.title,
      markets: Object.fromEntries(
        bk.markets.map((m) => [
          m.key,
          m.outcomes.map((o) => ({ name: o.name, price: o.price, point: o.point })),
        ])
      ),
    }));

    return { bookmakers };
  } catch (error) {
    console.error("[enrich:odds] Error:", error);
    return null;
  }
}

/**
 * Compute best available lines across all bookmakers.
 */
function computeBestLines(bookmakers: BookmakerData[], homeTeam: string) {
  let bestHomeML = -Infinity;
  let bestAwayML = -Infinity;
  let bestHomeSpread = -Infinity;
  let bestHomeSpreadOdds = -Infinity;
  let bestTotal: number | null = null;
  let bestOverOdds = -Infinity;
  let bestUnderOdds = -Infinity;
  let bestHomeMLBook = "";
  let bestAwayMLBook = "";
  let bestSpreadBook = "";
  let bestOverBook = "";
  let bestUnderBook = "";

  const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
  const homeNorm = normalizeTeam(homeTeam);

  for (const bk of bookmakers) {
    const h2h = bk.markets["h2h"] || [];
    const spreads = bk.markets["spreads"] || [];
    const totals = bk.markets["totals"] || [];

    for (const o of h2h) {
      const isHome = normalizeTeam(o.name).includes(homeNorm) || homeNorm.includes(normalizeTeam(o.name));
      if (isHome && o.price > bestHomeML) {
        bestHomeML = o.price;
        bestHomeMLBook = bk.name;
      }
      if (!isHome && o.price > bestAwayML) {
        bestAwayML = o.price;
        bestAwayMLBook = bk.name;
      }
    }

    for (const o of spreads) {
      const isHome = normalizeTeam(o.name).includes(homeNorm) || homeNorm.includes(normalizeTeam(o.name));
      if (isHome && o.point != null) {
        if (o.point > bestHomeSpread || (o.point === bestHomeSpread && o.price > bestHomeSpreadOdds)) {
          bestHomeSpread = o.point;
          bestHomeSpreadOdds = o.price;
          bestSpreadBook = bk.name;
        }
      }
    }

    for (const o of totals) {
      if (o.name === "Over" && o.price > bestOverOdds) {
        bestOverOdds = o.price;
        bestTotal = o.point ?? null;
        bestOverBook = bk.name;
      }
      if (o.name === "Under" && o.price > bestUnderOdds) {
        bestUnderOdds = o.price;
        bestUnderBook = bk.name;
      }
    }
  }

  return {
    homeML: bestHomeML > -Infinity ? { price: bestHomeML, book: bestHomeMLBook } : null,
    awayML: bestAwayML > -Infinity ? { price: bestAwayML, book: bestAwayMLBook } : null,
    homeSpread: bestHomeSpread > -Infinity ? { point: bestHomeSpread, price: bestHomeSpreadOdds, book: bestSpreadBook } : null,
    total: bestTotal != null ? { point: bestTotal, overPrice: bestOverOdds, underPrice: bestUnderOdds, overBook: bestOverBook, underBook: bestUnderBook } : null,
  };
}

function safeJSON(str: string) {
  try { return JSON.parse(str); } catch { return null; }
}
