/**
 * ESPN public API client for fetching live scores.
 * Uses the unofficial ESPN site API — free, no auth needed.
 */

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_PATHS: Record<string, string> = {
  MLB: "baseball/mlb",
  NBA: "basketball/nba",
  NFL: "football/nfl",
  NHL: "hockey/nhl",
  NCAAF: "football/college-football",
  NCAAB: "basketball/mens-college-basketball",
  MLS: "soccer/usa.1",
  "Liga MX": "soccer/mex.1",
  "Premier League": "soccer/eng.1",
  "La Liga": "soccer/esp.1",
  "Serie A": "soccer/ita.1",
  "Bundesliga": "soccer/ger.1",
  "Champions League": "soccer/uefa.champions",
};

export type ESPNGame = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "pre" | "in" | "post";
  statusDetail: string;
  startTime: string;
  // Period/inning scores for partial-game bets
  homeLinescores: number[];
  awayLinescores: number[];
};

type ESPNCompetitor = {
  homeAway: "home" | "away";
  team: { displayName: string };
  score: string;
  linescores?: { value: number }[];
};

type ESPNEvent = {
  id: string;
  date: string;
  status: {
    type: { state: "pre" | "in" | "post"; detail: string };
  };
  competitions: {
    competitors: ESPNCompetitor[];
  }[];
};

/**
 * Fetch all games for a sport on a given date.
 * @param sport - Sport key (e.g., "MLB", "NBA")
 * @param date - Date string in YYYYMMDD format
 */
export async function fetchScoreboard(
  sport: string,
  date: string
): Promise<ESPNGame[]> {
  const path = SPORT_PATHS[sport] || SPORT_PATHS[sport.toUpperCase()];
  if (!path) return [];

  const url = `${ESPN_BASE}/${path}/scoreboard?dates=${date}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];

    const data = await res.json();
    const events: ESPNEvent[] = data.events || [];

    return events.map((event) => {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home")!;
      const away = comp.competitors.find((c) => c.homeAway === "away")!;

      return {
        id: event.id,
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore: parseInt(home.score || "0", 10),
        awayScore: parseInt(away.score || "0", 10),
        status: event.status.type.state,
        statusDetail: event.status.type.detail,
        startTime: event.date,
        homeLinescores: (home.linescores || []).map((ls) => ls.value),
        awayLinescores: (away.linescores || []).map((ls) => ls.value),
      };
    });
  } catch {
    return [];
  }
}

// ─── Event Summary (detailed game data) ─────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ESPNTeamDetail = {
  name: string;
  abbreviation: string;
  logo: string;
  record: string;
  homeRecord: string;
  awayRecord: string;
  score: number;
  recentForm: string[];
};

export type ESPNInjury = {
  player: string;
  position: string;
  status: string;
  detail: string;
};

export type ESPNEventSummary = {
  id: string;
  league: string;
  startTime: string;
  status: "pre" | "in" | "post";
  statusDetail: string;
  venue: string | null;
  venueCity: string | null;
  broadcast: string | null;
  homeTeam: ESPNTeamDetail;
  awayTeam: ESPNTeamDetail;
  homeInjuries: ESPNInjury[];
  awayInjuries: ESPNInjury[];
  lastFiveHome: { opponent: string; result: string; score: string }[];
  lastFiveAway: { opponent: string; result: string; score: string }[];
  headlines: string[];
};

/**
 * Fetch detailed event summary from ESPN.
 * Tries the /summary endpoint for full data, falls back to scoreboard data.
 */
export async function fetchEventSummary(
  league: string,
  eventId: string
): Promise<ESPNEventSummary | null> {
  const path = SPORT_PATHS[league];
  if (!path) return null;

  try {
    const url = `${ESPN_BASE}/${path}/summary?event=${eventId}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return null;

    const data = await res.json();
    const event = data.header?.competitions?.[0];
    if (!event) return null;

    const homeComp = event.competitors?.find((c: any) => c.homeAway === "home");
    const awayComp = event.competitors?.find((c: any) => c.homeAway === "away");
    if (!homeComp || !awayComp) return null;

    // Extract venue
    const gameInfo = data.gameInfo;
    const venue = gameInfo?.venue?.fullName || null;
    const venueCity = gameInfo?.venue?.address
      ? [gameInfo.venue.address.city, gameInfo.venue.address.state]
          .filter(Boolean)
          .join(", ")
      : null;

    // Extract broadcast
    const broadcasts = event.broadcasts || [];
    const broadcast = broadcasts[0]?.media?.shortName || null;

    // Extract team records
    function parseRecords(comp: any): { overall: string; home: string; away: string } {
      const records = comp.record || [];
      const overall = records.find((r: any) => r.type === "total")?.displayValue || "";
      const home = records.find((r: any) => r.type === "home")?.displayValue || "";
      const away = records.find((r: any) => r.type === "road" || r.type === "away")?.displayValue || "";
      return { overall, home, away };
    }

    const homeRecords = parseRecords(homeComp);
    const awayRecords = parseRecords(awayComp);

    // Extract last 5 games (from team statistics / recent events if available)
    function extractLastFive(teamBoxscore: any): { opponent: string; result: string; score: string }[] {
      // ESPN summary doesn't always have recent games in the same format
      // We'll extract from the "previousCompetition" or leave empty
      return teamBoxscore || [];
    }

    // Extract injuries
    function parseInjuries(injuryData: any[]): ESPNInjury[] {
      if (!injuryData || !Array.isArray(injuryData)) return [];
      const result: ESPNInjury[] = [];
      for (const team of injuryData) {
        const entries = team.injuries || [];
        for (const inj of entries) {
          result.push({
            player: inj.athlete?.displayName || "Unknown",
            position: inj.athlete?.position?.abbreviation || "",
            status: inj.status || "",
            detail: inj.details?.detail || inj.details?.type || "",
          });
        }
      }
      return result;
    }

    const injuriesRaw = data.injuries || [];
    // ESPN groups injuries by team index
    const homeInjuries = injuriesRaw.length > 0
      ? parseInjuries([injuriesRaw.find((i: any) => i.team?.id === homeComp.id) || {}])
      : [];
    const awayInjuries = injuriesRaw.length > 0
      ? parseInjuries([injuriesRaw.find((i: any) => i.team?.id === awayComp.id) || {}])
      : [];

    // Extract headlines/news
    const headlines: string[] = [];
    const news = data.news?.articles || [];
    for (const article of news.slice(0, 5)) {
      if (article.headline) headlines.push(article.headline);
    }

    // Extract recent form / last events
    function extractForm(comp: any): string[] {
      const form = comp.form || "";
      return form ? form.split("").slice(0, 5) : [];
    }

    return {
      id: eventId,
      league,
      startTime: event.date || "",
      status: event.status?.type?.state || "pre",
      statusDetail: event.status?.type?.detail || "",
      venue,
      venueCity,
      broadcast,
      homeTeam: {
        name: homeComp.team?.displayName || "",
        abbreviation: homeComp.team?.abbreviation || "",
        logo: homeComp.team?.logos?.[0]?.href || "",
        record: homeRecords.overall,
        homeRecord: homeRecords.home,
        awayRecord: homeRecords.away,
        score: parseInt(homeComp.score || "0", 10),
        recentForm: extractForm(homeComp),
      },
      awayTeam: {
        name: awayComp.team?.displayName || "",
        abbreviation: awayComp.team?.abbreviation || "",
        logo: awayComp.team?.logos?.[0]?.href || "",
        record: awayRecords.overall,
        homeRecord: awayRecords.home,
        awayRecord: awayRecords.away,
        score: parseInt(awayComp.score || "0", 10),
        recentForm: extractForm(awayComp),
      },
      homeInjuries,
      awayInjuries,
      lastFiveHome: extractLastFive(null),
      lastFiveAway: extractLastFive(null),
      headlines,
    };
  } catch (error) {
    console.error("ESPN event summary error:", error);
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Format a Date to YYYYMMDD string for ESPN API.
 * When called without arguments, returns today's date in ET.
 */
export function toESPNDate(date?: Date): string {
  if (date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  // Default: today in ET (not UTC) — critical for Vercel servers
  const { todayET } = require("@/lib/timezone");
  return todayET();
}

export { SPORT_PATHS };
