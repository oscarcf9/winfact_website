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

/**
 * Format a Date to YYYYMMDD string for ESPN API.
 */
export function toESPNDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
