const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

const SPORT_KEYS: Record<string, string> = {
  MLB: "baseball_mlb",
  NFL: "americanfootball_nfl",
  NBA: "basketball_nba",
  NHL: "icehockey_nhl",
  Soccer: "soccer_usa_mls",
  NCAA: "basketball_ncaab",
};

type OddsEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        price: number;
        point?: number;
      }[];
    }[];
  }[];
};

export async function fetchOdds(
  sport: string,
  markets: string = "h2h,spreads,totals"
): Promise<{ events: OddsEvent[]; remaining: number; error?: string }> {
  const sportKey = SPORT_KEYS[sport];
  if (!sportKey) return { events: [], remaining: 0, error: `Unknown sport: ${sport}` };
  if (!ODDS_API_KEY) return { events: [], remaining: 0, error: "Odds API not configured" };

  try {
    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
    const res = await fetch(url);
    const remaining = parseInt(res.headers.get("x-requests-remaining") || "0");

    if (!res.ok) {
      return { events: [], remaining, error: `API returned ${res.status}` };
    }

    const events: OddsEvent[] = await res.json();
    return { events, remaining };
  } catch (error) {
    return { events: [], remaining: 0, error: String(error) };
  }
}

export async function fetchScores(sport: string): Promise<{ scores: unknown[]; error?: string }> {
  const sportKey = SPORT_KEYS[sport];
  if (!sportKey || !ODDS_API_KEY) return { scores: [], error: "Not configured" };

  try {
    const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=1`;
    const res = await fetch(url);
    if (!res.ok) return { scores: [], error: `API returned ${res.status}` };
    const scores = await res.json();
    return { scores };
  } catch (error) {
    return { scores: [], error: String(error) };
  }
}

export function detectLineMovement(
  openingOdds: number,
  currentOdds: number
): { moved: boolean; direction: "favorable" | "unfavorable" | "none"; magnitude: number } {
  const diff = Math.abs(currentOdds - openingOdds);
  if (diff < 5) return { moved: false, direction: "none", magnitude: 0 };
  return {
    moved: true,
    direction: currentOdds > openingOdds ? "favorable" : "unfavorable",
    magnitude: diff,
  };
}

export function detectSharpAction(
  publicBetPct: number,
  publicMoneyPct: number
): { isSharp: boolean; side: string; confidence: number } {
  const divergence = Math.abs(publicBetPct - publicMoneyPct);
  if (divergence < 15) return { isSharp: false, side: "", confidence: 0 };

  const side = publicMoneyPct > publicBetPct ? "money_side" : "bet_side";
  const confidence = Math.min(divergence / 50, 1) * 100;

  return { isSharp: true, side, confidence };
}

export function detectReverseLineMovement(
  publicBetPct: number,
  lineDirection: "up" | "down" | "flat"
): boolean {
  if (lineDirection === "flat") return false;
  if (publicBetPct > 60 && lineDirection === "down") return true;
  if (publicBetPct < 40 && lineDirection === "up") return true;
  return false;
}

export { SPORT_KEYS };
