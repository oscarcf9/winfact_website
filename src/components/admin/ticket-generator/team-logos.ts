// Team logo database using ESPN CDN (already allowed in CSP: a.espncdn.com)
// Format: https://a.espncdn.com/i/teamlogos/{sport}/500/{abbr}.png

export interface TeamLogo {
  name: string;
  abbr: string;
  url: string;
  sport: string;
}

const espn = (sport: string, abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/${sport}/500/${abbr}.png`;

export const TEAM_LOGOS: TeamLogo[] = [
  // ── NFL ──
  ...[
    ["Arizona Cardinals", "ARI"], ["Atlanta Falcons", "ATL"], ["Baltimore Ravens", "BAL"],
    ["Buffalo Bills", "BUF"], ["Carolina Panthers", "CAR"], ["Chicago Bears", "CHI"],
    ["Cincinnati Bengals", "CIN"], ["Cleveland Browns", "CLE"], ["Dallas Cowboys", "DAL"],
    ["Denver Broncos", "DEN"], ["Detroit Lions", "DET"], ["Green Bay Packers", "GB"],
    ["Houston Texans", "HOU"], ["Indianapolis Colts", "IND"], ["Jacksonville Jaguars", "JAX"],
    ["Kansas City Chiefs", "KC"], ["Las Vegas Raiders", "LV"], ["Los Angeles Chargers", "LAC"],
    ["Los Angeles Rams", "LAR"], ["Miami Dolphins", "MIA"], ["Minnesota Vikings", "MIN"],
    ["New England Patriots", "NE"], ["New Orleans Saints", "NO"], ["New York Giants", "NYG"],
    ["New York Jets", "NYJ"], ["Philadelphia Eagles", "PHI"], ["Pittsburgh Steelers", "PIT"],
    ["San Francisco 49ers", "SF"], ["Seattle Seahawks", "SEA"], ["Tampa Bay Buccaneers", "TB"],
    ["Tennessee Titans", "TEN"], ["Washington Commanders", "WSH"],
  ].map(([name, abbr]) => ({ name, abbr, url: espn("nfl", abbr.toLowerCase()), sport: "nfl" })),

  // ── MLB ──
  ...[
    ["Arizona Diamondbacks", "ARI"], ["Atlanta Braves", "ATL"], ["Baltimore Orioles", "BAL"],
    ["Boston Red Sox", "BOS"], ["Chicago Cubs", "CHC"], ["Chicago White Sox", "CHW"],
    ["Cincinnati Reds", "CIN"], ["Cleveland Guardians", "CLE"], ["Colorado Rockies", "COL"],
    ["Detroit Tigers", "DET"], ["Houston Astros", "HOU"], ["Kansas City Royals", "KC"],
    ["Los Angeles Angels", "LAA"], ["Los Angeles Dodgers", "LAD"], ["Miami Marlins", "MIA"],
    ["Milwaukee Brewers", "MIL"], ["Minnesota Twins", "MIN"], ["New York Mets", "NYM"],
    ["New York Yankees", "NYY"], ["Oakland Athletics", "OAK"], ["Philadelphia Phillies", "PHI"],
    ["Pittsburgh Pirates", "PIT"], ["San Diego Padres", "SD"], ["San Francisco Giants", "SF"],
    ["Seattle Mariners", "SEA"], ["St. Louis Cardinals", "STL"], ["Tampa Bay Rays", "TB"],
    ["Texas Rangers", "TEX"], ["Toronto Blue Jays", "TOR"], ["Washington Nationals", "WSH"],
  ].map(([name, abbr]) => ({ name, abbr, url: espn("mlb", abbr.toLowerCase()), sport: "mlb" })),

  // ── NBA ──
  ...[
    ["Atlanta Hawks", "ATL"], ["Boston Celtics", "BOS"], ["Brooklyn Nets", "BKN"],
    ["Charlotte Hornets", "CHA"], ["Chicago Bulls", "CHI"], ["Cleveland Cavaliers", "CLE"],
    ["Dallas Mavericks", "DAL"], ["Denver Nuggets", "DEN"], ["Detroit Pistons", "DET"],
    ["Golden State Warriors", "GS"], ["Houston Rockets", "HOU"], ["Indiana Pacers", "IND"],
    ["Los Angeles Clippers", "LAC"], ["Los Angeles Lakers", "LAL"], ["Memphis Grizzlies", "MEM"],
    ["Miami Heat", "MIA"], ["Milwaukee Bucks", "MIL"], ["Minnesota Timberwolves", "MIN"],
    ["New Orleans Pelicans", "NO"], ["New York Knicks", "NY"], ["Oklahoma City Thunder", "OKC"],
    ["Orlando Magic", "ORL"], ["Philadelphia 76ers", "PHI"], ["Phoenix Suns", "PHX"],
    ["Portland Trail Blazers", "POR"], ["Sacramento Kings", "SAC"], ["San Antonio Spurs", "SA"],
    ["Toronto Raptors", "TOR"], ["Utah Jazz", "UTAH"], ["Washington Wizards", "WSH"],
  ].map(([name, abbr]) => ({ name, abbr, url: espn("nba", abbr.toLowerCase()), sport: "nba" })),

  // ── NHL ──
  ...[
    ["Anaheim Ducks", "ANA"], ["Arizona Coyotes", "ARI"], ["Boston Bruins", "BOS"],
    ["Buffalo Sabres", "BUF"], ["Calgary Flames", "CGY"], ["Carolina Hurricanes", "CAR"],
    ["Chicago Blackhawks", "CHI"], ["Colorado Avalanche", "COL"], ["Columbus Blue Jackets", "CBJ"],
    ["Dallas Stars", "DAL"], ["Detroit Red Wings", "DET"], ["Edmonton Oilers", "EDM"],
    ["Florida Panthers", "FLA"], ["Los Angeles Kings", "LA"], ["Minnesota Wild", "MIN"],
    ["Montreal Canadiens", "MTL"], ["Nashville Predators", "NSH"], ["New Jersey Devils", "NJ"],
    ["New York Islanders", "NYI"], ["New York Rangers", "NYR"], ["Ottawa Senators", "OTT"],
    ["Philadelphia Flyers", "PHI"], ["Pittsburgh Penguins", "PIT"], ["San Jose Sharks", "SJ"],
    ["Seattle Kraken", "SEA"], ["St. Louis Blues", "STL"], ["Tampa Bay Lightning", "TB"],
    ["Toronto Maple Leafs", "TOR"], ["Vancouver Canucks", "VAN"], ["Vegas Golden Knights", "VGK"],
    ["Washington Capitals", "WSH"], ["Winnipeg Jets", "WPG"],
  ].map(([name, abbr]) => ({ name, abbr, url: espn("nhl", abbr.toLowerCase()), sport: "nhl" })),
];

/**
 * Search teams by name, abbreviation, or sport.
 * Returns max 20 results.
 */
export function searchTeams(query: string, sportFilter?: string): TeamLogo[] {
  const q = query.toLowerCase().trim();
  let results = TEAM_LOGOS;

  if (sportFilter) {
    results = results.filter((t) => t.sport === sportFilter);
  }

  if (q) {
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q)
    );
  }

  return results.slice(0, 20);
}

/**
 * Fetch an image URL and convert to base64 data URL.
 * Used to embed external logos into the ticket canvas for html-to-image export.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
