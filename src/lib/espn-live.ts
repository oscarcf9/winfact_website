/**
 * ESPN live scores fetcher for the commentary bot.
 * Fetches current scoreboard data and filters for in-progress "interesting" games.
 */

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const LIVE_ENDPOINTS: Record<string, string> = {
  NBA: "basketball/nba",
  MLB: "baseball/mlb",
  NFL: "football/nfl",
  NHL: "hockey/nhl",
  LALIGA: "soccer/esp.1",
  PREMIER: "soccer/eng.1",
  LIGA_MX: "soccer/mex.1",
  UCL: "soccer/uefa.champions",
};

// Teams we care about — 'all' means every game in that league
const TARGET_TEAMS: Record<string, string[] | "all"> = {
  NBA: "all",
  MLB: "all",
  NFL: "all",
  NHL: "all",
  LALIGA: ["Real Madrid", "Barcelona", "Atletico Madrid", "Athletic Club", "Villarreal"],
  PREMIER: [
    "Arsenal", "Manchester City", "Liverpool", "Chelsea", "Manchester United",
    "Tottenham", "Newcastle", "Aston Villa", "Brighton", "West Ham",
  ],
  LIGA_MX: ["Club America", "Guadalajara", "Cruz Azul", "UNAM Pumas", "Monterrey", "Tigres UANL"],
  UCL: "all",
};

export type LiveGame = {
  gameId: string;
  sport: string;
  league: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number;
  clock: string;
  status: "pre" | "in" | "post";
  situation: string;
  isInteresting: boolean;
};

export async function fetchAllLiveGames(): Promise<LiveGame[]> {
  const allGames: LiveGame[] = [];

  const fetches = Object.entries(LIVE_ENDPOINTS).map(async ([sport, path]) => {
    try {
      const url = `${ESPN_BASE}/${path}/scoreboard`;
      const response = await fetch(url, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "WinFactPicks/1.0" },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return parseScoreboard(data, sport);
    } catch (error) {
      console.error(`[live-commentary] Failed to fetch ${sport}:`, error);
      return [];
    }
  });

  const results = await Promise.all(fetches);
  for (const games of results) allGames.push(...games);

  return allGames;
}

function parseScoreboard(data: any, sport: string): LiveGame[] {
  const games: LiveGame[] = [];
  if (!data.events) return games;

  const targetTeams = TARGET_TEAMS[sport];
  const leagueName = data.leagues?.[0]?.name || sport;
  const isSoccer = ["LALIGA", "PREMIER", "LIGA_MX", "UCL"].includes(sport);
  const isBaseball = sport === "MLB";
  const isFootball = sport === "NFL";

  for (const event of data.events) {
    const state = event.status?.type?.state;
    if (state !== "in") continue; // Only live games

    const competition = event.competitions?.[0];
    if (!competition) continue;

    const competitors = competition.competitors;
    const team1 = competitors[0]?.team?.displayName || "Team 1";
    const team2 = competitors[1]?.team?.displayName || "Team 2";

    // Filter by target teams
    if (targetTeams !== "all") {
      const isTargetGame = targetTeams.some(
        (t) => team1.includes(t) || team2.includes(t)
      );
      if (!isTargetGame) continue;
    }

    const score1 = parseInt(competitors[0]?.score) || 0;
    const score2 = parseInt(competitors[1]?.score) || 0;
    const diff = Math.abs(score1 - score2);
    const total = score1 + score2;
    const period = event.status?.period || 1;
    const clock = event.status?.displayClock || "";

    let isInteresting = false;
    let situation = "";

    if (isSoccer) {
      if (diff <= 1) { isInteresting = true; situation = "close_game"; }
      if (total >= 3) { isInteresting = true; situation = "high_scoring"; }
      if (period >= 2 && diff <= 2) { isInteresting = true; situation = "late_drama"; }
    } else if (isBaseball) {
      if (diff <= 3) { isInteresting = true; situation = "close_game"; }
      if (total >= 8) { isInteresting = true; situation = "high_scoring"; }
      if (period >= 7 && diff <= 5) { isInteresting = true; situation = "late_innings"; }
    } else if (isFootball) {
      if (diff <= 10) { isInteresting = true; situation = "close_game"; }
      if (total > 40) { isInteresting = true; situation = "high_scoring"; }
      if (period >= 4 && diff <= 14) { isInteresting = true; situation = "fourth_quarter"; }
    } else if (sport === "NBA") {
      if (diff <= 10) { isInteresting = true; situation = "close_game"; }
      if (total > 180) { isInteresting = true; situation = "high_scoring"; }
      if (period >= 4 && diff <= 15) { isInteresting = true; situation = "late_game"; }
    } else {
      // NHL
      if (diff <= 2) { isInteresting = true; situation = "close_game"; }
      if (total >= 6) { isInteresting = true; situation = "high_scoring"; }
      if (period >= 3 && diff <= 2) { isInteresting = true; situation = "late_game"; }
    }

    // Blowouts can be interesting too
    if (!isInteresting && diff > 20) {
      isInteresting = true;
      situation = "blowout";
    }

    games.push({
      gameId: event.id,
      sport,
      league: leagueName,
      team1, team2,
      score1, score2,
      period, clock,
      status: state,
      situation,
      isInteresting,
    });
  }

  return games;
}
