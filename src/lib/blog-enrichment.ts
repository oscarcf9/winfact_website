/**
 * Blog enrichment pipeline — fetches real sports data from ESPN + The Odds API
 * to inject into AI blog generation prompts.
 */

import { fetchScoreboard, fetchEventSummary, toESPNDate, SPORT_PATHS } from "./espn";
import type { ESPNEventSummary, ESPNInjury } from "./espn";
import { fetchOdds } from "./odds-api";
import { normalizeTeamName } from "./team-normalizer";

// ─── Types ────────────────────────────────────────────────────

export type EnrichmentInput = {
  sport: string;
  league?: string | null;
  matchup: string; // "Team A vs Team B"
  pickText: string;
  gameDate: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  analysisEn?: string | null;
};

export type EnrichmentResult = {
  dataBlock: string;
  teamAFullName: string;
  teamBFullName: string;
  sportName: string;
  fetchLog: { field: string; status: "ok" | "unavailable"; detail?: string }[];
};

// ─── In-memory cache (15-minute TTL) ──────────────────────────

type CacheEntry<T> = { data: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ─── Main enrichment function ─────────────────────────────────

export async function enrichPickData(input: EnrichmentInput): Promise<EnrichmentResult> {
  const fetchLog: EnrichmentResult["fetchLog"] = [];
  const sport = input.sport.toUpperCase();
  const leagueKey = input.league || sport;

  // Step 1: Parse matchup and normalize team names
  const parts = input.matchup.split(/\s+vs\.?\s+/i).map((t) => t.trim());
  const rawTeamA = parts[0] || input.matchup;
  const rawTeamB = parts[1] || "";

  const teamAFullName = normalizeTeamName(rawTeamA, sport);
  const teamBFullName = rawTeamB ? normalizeTeamName(rawTeamB, sport) : rawTeamA;

  const sportName = getSportDisplayName(sport, input.league);

  // Step 2 & 3: Fetch ESPN + Odds data in parallel
  const gameDate = input.gameDate || new Date().toISOString().split("T")[0];
  const espnDate = toESPNDate(new Date(gameDate + "T12:00:00"));

  const [espnData, oddsData] = await Promise.all([
    fetchESPNData(leagueKey, sport, espnDate, teamAFullName, teamBFullName, fetchLog),
    fetchOddsData(sport, teamAFullName, teamBFullName, fetchLog),
  ]);

  // Step 4: Sport-specific context
  const sportContext = getSportSpecificContext(sport, espnData);

  // Step 5: Format data block
  const dataBlock = formatDataBlock({
    sport: sportName,
    teamAFullName,
    teamBFullName,
    gameDate,
    input,
    espnData,
    oddsData,
    sportContext,
  });

  return { dataBlock, teamAFullName, teamBFullName, sportName, fetchLog };
}

// ─── ESPN data fetching ───────────────────────────────────────

type ESPNData = {
  summary: ESPNEventSummary | null;
  gameTime: string;
};

async function fetchESPNData(
  leagueKey: string,
  sport: string,
  espnDate: string,
  teamA: string,
  teamB: string,
  fetchLog: EnrichmentResult["fetchLog"]
): Promise<ESPNData> {
  const cacheKey = `espn_${leagueKey}_${espnDate}_${teamA}_${teamB}`;
  const cached = getCached<ESPNData>(cacheKey);
  if (cached) {
    fetchLog.push({ field: "espn_data", status: "ok", detail: "from cache" });
    return cached;
  }

  try {
    // First find the game on the scoreboard to get event ID
    const resolvedLeague = resolveESPNLeague(leagueKey, sport);
    const games = await fetchScoreboard(resolvedLeague, espnDate);

    const game = games.find((g) => {
      const homeMatch = teamNamesOverlap(g.homeTeam, teamA, sport) || teamNamesOverlap(g.homeTeam, teamB, sport);
      const awayMatch = teamNamesOverlap(g.awayTeam, teamA, sport) || teamNamesOverlap(g.awayTeam, teamB, sport);
      return homeMatch && awayMatch;
    });

    if (!game) {
      fetchLog.push({ field: "espn_scoreboard", status: "unavailable", detail: "Game not found on ESPN" });
      return { summary: null, gameTime: "" };
    }

    fetchLog.push({ field: "espn_scoreboard", status: "ok" });

    // Fetch detailed summary
    const summary = await fetchEventSummary(resolvedLeague, game.id);
    if (summary) {
      fetchLog.push({ field: "espn_summary", status: "ok" });
      const result: ESPNData = { summary, gameTime: game.startTime };
      setCache(cacheKey, result);
      return result;
    } else {
      fetchLog.push({ field: "espn_summary", status: "unavailable" });
      return { summary: null, gameTime: game.startTime };
    }
  } catch (err) {
    fetchLog.push({ field: "espn_data", status: "unavailable", detail: String(err) });
    return { summary: null, gameTime: "" };
  }
}

function resolveESPNLeague(leagueKey: string, sport: string): string {
  // Try the league key directly, then sport
  if (SPORT_PATHS[leagueKey]) return leagueKey;
  if (SPORT_PATHS[sport]) return sport;
  if (SPORT_PATHS[sport.toUpperCase()]) return sport.toUpperCase();
  return leagueKey;
}

function teamNamesOverlap(espnName: string, inputName: string, sport: string): boolean {
  const a = espnName.toLowerCase();
  const b = inputName.toLowerCase();
  if (a === b) return true;
  // Check if last word matches (e.g., "Lakers" in "Los Angeles Lakers")
  const lastA = a.split(" ").pop() || "";
  const lastB = b.split(" ").pop() || "";
  if (lastA === lastB && lastA.length > 2) return true;
  if (a.includes(lastB) && lastB.length > 2) return true;
  if (b.includes(lastA) && lastA.length > 2) return true;
  // Try normalizer
  const normA = normalizeTeamName(espnName, sport).toLowerCase();
  const normB = normalizeTeamName(inputName, sport).toLowerCase();
  return normA === normB;
}

// ─── Odds API data fetching ──────────────────────────────────

type OddsMatchData = {
  bookComparison: string;
  currentSpread: string;
  currentTotal: string;
  sharpAction: string;
  reverseLineMovement: string;
  homeTeamOdds: string;
  awayTeamOdds: string;
};

async function fetchOddsData(
  sport: string,
  teamA: string,
  teamB: string,
  fetchLog: EnrichmentResult["fetchLog"]
): Promise<OddsMatchData | null> {
  const cacheKey = `odds_${sport}_${teamA}_${teamB}`;
  const cached = getCached<OddsMatchData>(cacheKey);
  if (cached) {
    fetchLog.push({ field: "odds_data", status: "ok", detail: "from cache" });
    return cached;
  }

  try {
    const { events, error } = await fetchOdds(sport, "h2h,spreads,totals");
    if (error || events.length === 0) {
      fetchLog.push({ field: "odds_data", status: "unavailable", detail: error || "No events" });
      return null;
    }

    // Find the matching event
    const event = events.find((e) => {
      const homeMatch = teamNamesOverlap(e.home_team, teamA, sport) || teamNamesOverlap(e.home_team, teamB, sport);
      const awayMatch = teamNamesOverlap(e.away_team, teamA, sport) || teamNamesOverlap(e.away_team, teamB, sport);
      return homeMatch && awayMatch;
    });

    if (!event) {
      fetchLog.push({ field: "odds_data", status: "unavailable", detail: "Game not found in odds data" });
      return null;
    }

    fetchLog.push({ field: "odds_data", status: "ok" });

    // Build book comparison from bookmakers
    const bookLines: string[] = [];
    let currentSpread = "Data unavailable";
    let currentTotal = "Data unavailable";

    for (const book of event.bookmakers.slice(0, 5)) {
      const spreadMarket = book.markets.find((m) => m.key === "spreads");
      const h2hMarket = book.markets.find((m) => m.key === "h2h");
      const totalsMarket = book.markets.find((m) => m.key === "totals");

      if (spreadMarket) {
        const homeSpread = spreadMarket.outcomes.find((o) =>
          teamNamesOverlap(o.name, event.home_team, sport)
        );
        const awaySpread = spreadMarket.outcomes.find((o) =>
          teamNamesOverlap(o.name, event.away_team, sport)
        );
        if (homeSpread) {
          const line = homeSpread.point !== undefined ? `${homeSpread.point > 0 ? "+" : ""}${homeSpread.point}` : "";
          bookLines.push(`${book.title}: ${event.home_team} ${line} (${formatOdds(homeSpread.price)})`);
          if (currentSpread === "Data unavailable") {
            currentSpread = `${event.home_team} ${line}`;
          }
        } else if (awaySpread) {
          const line = awaySpread.point !== undefined ? `${awaySpread.point > 0 ? "+" : ""}${awaySpread.point}` : "";
          bookLines.push(`${book.title}: ${event.away_team} ${line} (${formatOdds(awaySpread.price)})`);
        }
      } else if (h2hMarket) {
        const home = h2hMarket.outcomes.find((o) =>
          teamNamesOverlap(o.name, event.home_team, sport)
        );
        if (home) {
          bookLines.push(`${book.title}: ${event.home_team} (${formatOdds(home.price)})`);
        }
      }

      if (totalsMarket && currentTotal === "Data unavailable") {
        const over = totalsMarket.outcomes.find((o) => o.name === "Over");
        if (over && over.point !== undefined) {
          currentTotal = `O/U ${over.point}`;
        }
      }
    }

    // Sharp action and RLM analysis (simulated with available data)
    // The Odds API doesn't provide public bet percentages directly,
    // but we can analyze line movement across books as a proxy
    const spreadValues: number[] = [];
    for (const book of event.bookmakers) {
      const spreadMarket = book.markets.find((m) => m.key === "spreads");
      if (spreadMarket) {
        const homeSpread = spreadMarket.outcomes.find((o) =>
          teamNamesOverlap(o.name, event.home_team, sport)
        );
        if (homeSpread?.point !== undefined) {
          spreadValues.push(homeSpread.point);
        }
      }
    }

    let sharpAction = "None detected";
    let reverseLineMovement = "None detected";

    if (spreadValues.length >= 3) {
      const avg = spreadValues.reduce((a, b) => a + b, 0) / spreadValues.length;
      const variance = spreadValues.reduce((a, b) => a + Math.abs(b - avg), 0) / spreadValues.length;
      if (variance > 0.5) {
        sharpAction = `Possible sharp action detected (spread variance: ${variance.toFixed(1)} points across ${spreadValues.length} books)`;
      }
    }

    const result: OddsMatchData = {
      bookComparison: bookLines.length > 0 ? bookLines.join(", ") : "Data unavailable",
      currentSpread,
      currentTotal,
      sharpAction,
      reverseLineMovement,
      homeTeamOdds: event.home_team,
      awayTeamOdds: event.away_team,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    fetchLog.push({ field: "odds_data", status: "unavailable", detail: String(err) });
    return null;
  }
}

function formatOdds(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

// ─── Sport-specific context ──────────────────────────────────

function getSportSpecificContext(sport: string, _espnData: ESPNData): string {
  switch (sport) {
    case "MLB":
      return "Sport-specific: MLB game. Look for probable pitchers, bullpen usage, and park factors in the data.";
    case "NFL":
      return "Sport-specific: NFL game. Focus on key injuries by position group, weather for outdoor stadiums, and coaching matchups.";
    case "NBA":
      return "Sport-specific: NBA game. Consider back-to-back schedule, rest days, pace of play matchup, and lineup rotations.";
    case "NHL":
      return "Sport-specific: NHL game. Focus on goaltender starts, special teams (PP/PK), and recent travel schedule.";
    case "NCAAB":
    case "NCAAF":
      return "Sport-specific: NCAA game. Consider conference standings, rivalry factors, and home court/field advantage.";
    default:
      if (sport.toLowerCase().includes("soccer") || SPORT_PATHS[sport]?.startsWith("soccer")) {
        return "Sport-specific: Soccer match. Focus on league table position, recent form, possible continental competition fatigue, and tactical formations.";
      }
      return "";
  }
}

// ─── Data block formatting ───────────────────────────────────

function formatDataBlock(params: {
  sport: string;
  teamAFullName: string;
  teamBFullName: string;
  gameDate: string;
  input: EnrichmentInput;
  espnData: ESPNData;
  oddsData: OddsMatchData | null;
  sportContext: string;
}): string {
  const { sport, teamAFullName, teamBFullName, gameDate, input, espnData, oddsData, sportContext } = params;
  const s = espnData.summary;

  const gameTime = espnData.gameTime
    ? new Date(espnData.gameTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
    : "Data unavailable";

  const venue = s?.venue || "Data unavailable";
  const venueCity = s?.venueCity || "Data unavailable";

  // Determine correct team assignment from ESPN data
  let teamAESPN = s?.awayTeam;
  let teamBESPN = s?.homeTeam;
  let teamAInjuries = s?.awayInjuries || [];
  let teamBInjuries = s?.homeInjuries || [];

  if (s) {
    const aMatchesHome = teamNamesOverlap(s.homeTeam.name, teamAFullName, input.sport);
    if (aMatchesHome) {
      teamAESPN = s.homeTeam;
      teamBESPN = s.awayTeam;
      teamAInjuries = s.homeInjuries;
      teamBInjuries = s.awayInjuries;
    }
  }

  const oddsSection = oddsData
    ? `ODDS & LINE DATA (from The Odds API):
- Current Spread: ${oddsData.currentSpread}
- Over/Under: ${oddsData.currentTotal}
- Sharp Action: ${oddsData.sharpAction}
- Reverse Line Movement: ${oddsData.reverseLineMovement}
- Book Comparison: ${oddsData.bookComparison}`
    : `ODDS & LINE DATA (from The Odds API):
Data unavailable`;

  const headlines = s?.headlines?.length
    ? `\nRECENT HEADLINES:\n${s.headlines.map((h) => `- ${h}`).join("\n")}`
    : "";

  return `SPORT: ${sport}
MATCHUP: ${teamAFullName} vs ${teamBFullName}
DATE: ${formatDisplayDate(gameDate)}
TIME: ${gameTime} ET
VENUE: ${venue}, ${venueCity}
${sportContext ? `\nSPORT CONTEXT: ${sportContext}` : ""}

PICK CONTEXT:
- Pick: ${input.pickText}
- Odds: ${input.odds ? (input.odds > 0 ? "+" : "") + input.odds : "Data unavailable"} (American)
- Units: ${input.units || "Data unavailable"}
- Confidence: ${input.confidence || "Data unavailable"}
- Capper Analysis: ${input.analysisEn || "No analysis provided"}

TEAM A — ${teamAFullName}:
- Season Record: ${teamAESPN?.record || "Data unavailable"}
- Home Record: ${teamAESPN?.homeRecord || "Data unavailable"}
- Away Record: ${teamAESPN?.awayRecord || "Data unavailable"}
- Recent Form: ${teamAESPN?.recentForm?.length ? teamAESPN.recentForm.join("") : "Data unavailable"}
- Key Injuries: ${formatInjuries(teamAInjuries)}

TEAM B — ${teamBFullName}:
- Season Record: ${teamBESPN?.record || "Data unavailable"}
- Home Record: ${teamBESPN?.homeRecord || "Data unavailable"}
- Away Record: ${teamBESPN?.awayRecord || "Data unavailable"}
- Recent Form: ${teamBESPN?.recentForm?.length ? teamBESPN.recentForm.join("") : "Data unavailable"}
- Key Injuries: ${formatInjuries(teamBInjuries)}

${oddsSection}
${headlines}`;
}

function formatInjuries(injuries: ESPNInjury[]): string {
  if (!injuries || injuries.length === 0) return "No significant injuries reported";
  return injuries
    .slice(0, 10) // Cap at 10 injuries to keep prompt reasonable
    .map((inj) => `${inj.player} (${inj.status}${inj.detail ? ` - ${inj.detail}` : ""}${inj.position ? `, ${inj.position}` : ""})`)
    .join(", ");
}

function formatDisplayDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getSportDisplayName(sport: string, league?: string | null): string {
  if (league) return league;
  const map: Record<string, string> = {
    MLB: "MLB",
    NBA: "NBA",
    NFL: "NFL",
    NHL: "NHL",
    NCAAB: "NCAA Basketball",
    NCAAF: "NCAA Football",
    MLS: "MLS",
    "PREMIER LEAGUE": "Premier League",
    "LA LIGA": "La Liga",
    "SERIE A": "Serie A",
    BUNDESLIGA: "Bundesliga",
    "CHAMPIONS LEAGUE": "Champions League",
  };
  return map[sport.toUpperCase()] || sport;
}
