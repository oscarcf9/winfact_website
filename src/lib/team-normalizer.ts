/**
 * Team name normalizer — maps short/common names to ESPN full names.
 * Used by the auto-settler to match pick text against ESPN scoreboard data.
 */

const MLB_TEAMS: Record<string, string> = {
  // Short → Full
  "diamondbacks": "Arizona Diamondbacks", "dbacks": "Arizona Diamondbacks", "ari": "Arizona Diamondbacks",
  "braves": "Atlanta Braves", "atl": "Atlanta Braves",
  "orioles": "Baltimore Orioles", "bal": "Baltimore Orioles",
  "red sox": "Boston Red Sox", "bos": "Boston Red Sox",
  "cubs": "Chicago Cubs", "chc": "Chicago Cubs",
  "white sox": "Chicago White Sox", "chw": "Chicago White Sox", "cws": "Chicago White Sox",
  "reds": "Cincinnati Reds", "cin": "Cincinnati Reds",
  "guardians": "Cleveland Guardians", "cle": "Cleveland Guardians",
  "rockies": "Colorado Rockies", "col": "Colorado Rockies",
  "tigers": "Detroit Tigers", "det": "Detroit Tigers",
  "astros": "Houston Astros", "hou": "Houston Astros",
  "royals": "Kansas City Royals", "kc": "Kansas City Royals",
  "angels": "Los Angeles Angels", "laa": "Los Angeles Angels",
  "dodgers": "Los Angeles Dodgers", "lad": "Los Angeles Dodgers",
  "marlins": "Miami Marlins", "mia": "Miami Marlins",
  "brewers": "Milwaukee Brewers", "mil": "Milwaukee Brewers",
  "twins": "Minnesota Twins", "min": "Minnesota Twins",
  "mets": "New York Mets", "nym": "New York Mets",
  "yankees": "New York Yankees", "nyy": "New York Yankees",
  "athletics": "Oakland Athletics", "a's": "Oakland Athletics", "oak": "Oakland Athletics",
  "phillies": "Philadelphia Phillies", "phi": "Philadelphia Phillies",
  "pirates": "Pittsburgh Pirates", "pit": "Pittsburgh Pirates",
  "padres": "San Diego Padres", "sd": "San Diego Padres",
  "giants": "San Francisco Giants", "sf": "San Francisco Giants",
  "mariners": "Seattle Mariners", "sea": "Seattle Mariners",
  "cardinals": "St. Louis Cardinals", "stl": "St. Louis Cardinals",
  "rays": "Tampa Bay Rays", "tb": "Tampa Bay Rays",
  "rangers": "Texas Rangers", "tex": "Texas Rangers",
  "blue jays": "Toronto Blue Jays", "tor": "Toronto Blue Jays",
  "nationals": "Washington Nationals", "was": "Washington Nationals", "wsh": "Washington Nationals",
};

const NBA_TEAMS: Record<string, string> = {
  "hawks": "Atlanta Hawks", "atl": "Atlanta Hawks",
  "celtics": "Boston Celtics", "bos": "Boston Celtics",
  "nets": "Brooklyn Nets", "bkn": "Brooklyn Nets",
  "hornets": "Charlotte Hornets", "cha": "Charlotte Hornets",
  "bulls": "Chicago Bulls", "chi": "Chicago Bulls",
  "cavaliers": "Cleveland Cavaliers", "cavs": "Cleveland Cavaliers", "cle": "Cleveland Cavaliers",
  "mavericks": "Dallas Mavericks", "mavs": "Dallas Mavericks", "dal": "Dallas Mavericks",
  "nuggets": "Denver Nuggets", "den": "Denver Nuggets",
  "pistons": "Detroit Pistons", "det": "Detroit Pistons",
  "warriors": "Golden State Warriors", "gsw": "Golden State Warriors",
  "rockets": "Houston Rockets", "hou": "Houston Rockets",
  "pacers": "Indiana Pacers", "ind": "Indiana Pacers",
  "clippers": "LA Clippers", "lac": "LA Clippers",
  "lakers": "Los Angeles Lakers", "lal": "Los Angeles Lakers",
  "grizzlies": "Memphis Grizzlies", "mem": "Memphis Grizzlies",
  "heat": "Miami Heat", "mia": "Miami Heat",
  "bucks": "Milwaukee Bucks", "mil": "Milwaukee Bucks",
  "timberwolves": "Minnesota Timberwolves", "wolves": "Minnesota Timberwolves", "min": "Minnesota Timberwolves",
  "pelicans": "New Orleans Pelicans", "nop": "New Orleans Pelicans",
  "knicks": "New York Knicks", "nyk": "New York Knicks",
  "thunder": "Oklahoma City Thunder", "okc": "Oklahoma City Thunder",
  "magic": "Orlando Magic", "orl": "Orlando Magic",
  "76ers": "Philadelphia 76ers", "sixers": "Philadelphia 76ers", "phi": "Philadelphia 76ers",
  "suns": "Phoenix Suns", "phx": "Phoenix Suns",
  "trail blazers": "Portland Trail Blazers", "blazers": "Portland Trail Blazers", "por": "Portland Trail Blazers",
  "kings": "Sacramento Kings", "sac": "Sacramento Kings",
  "spurs": "San Antonio Spurs", "sas": "San Antonio Spurs",
  "raptors": "Toronto Raptors", "tor": "Toronto Raptors",
  "jazz": "Utah Jazz", "uta": "Utah Jazz",
  "wizards": "Washington Wizards", "wiz": "Washington Wizards", "was": "Washington Wizards",
};

const NFL_TEAMS: Record<string, string> = {
  "cardinals": "Arizona Cardinals", "ari": "Arizona Cardinals",
  "falcons": "Atlanta Falcons", "atl": "Atlanta Falcons",
  "ravens": "Baltimore Ravens", "bal": "Baltimore Ravens",
  "bills": "Buffalo Bills", "buf": "Buffalo Bills",
  "panthers": "Carolina Panthers", "car": "Carolina Panthers",
  "bears": "Chicago Bears", "chi": "Chicago Bears",
  "bengals": "Cincinnati Bengals", "cin": "Cincinnati Bengals",
  "browns": "Cleveland Browns", "cle": "Cleveland Browns",
  "cowboys": "Dallas Cowboys", "dal": "Dallas Cowboys",
  "broncos": "Denver Broncos", "den": "Denver Broncos",
  "lions": "Detroit Lions", "det": "Detroit Lions",
  "packers": "Green Bay Packers", "gb": "Green Bay Packers",
  "texans": "Houston Texans", "hou": "Houston Texans",
  "colts": "Indianapolis Colts", "ind": "Indianapolis Colts",
  "jaguars": "Jacksonville Jaguars", "jags": "Jacksonville Jaguars", "jax": "Jacksonville Jaguars",
  "chiefs": "Kansas City Chiefs", "kc": "Kansas City Chiefs",
  "raiders": "Las Vegas Raiders", "lv": "Las Vegas Raiders",
  "chargers": "Los Angeles Chargers", "lac": "Los Angeles Chargers",
  "rams": "Los Angeles Rams", "lar": "Los Angeles Rams",
  "dolphins": "Miami Dolphins", "mia": "Miami Dolphins",
  "vikings": "Minnesota Vikings", "min": "Minnesota Vikings",
  "patriots": "New England Patriots", "pats": "New England Patriots", "ne": "New England Patriots",
  "saints": "New Orleans Saints", "no": "New Orleans Saints",
  "giants": "New York Giants", "nyg": "New York Giants",
  "jets": "New York Jets", "nyj": "New York Jets",
  "eagles": "Philadelphia Eagles", "phi": "Philadelphia Eagles",
  "steelers": "Pittsburgh Steelers", "pit": "Pittsburgh Steelers",
  "49ers": "San Francisco 49ers", "niners": "San Francisco 49ers", "sf": "San Francisco 49ers",
  "seahawks": "Seattle Seahawks", "sea": "Seattle Seahawks",
  "buccaneers": "Tampa Bay Buccaneers", "bucs": "Tampa Bay Buccaneers", "tb": "Tampa Bay Buccaneers",
  "titans": "Tennessee Titans", "ten": "Tennessee Titans",
  "commanders": "Washington Commanders", "was": "Washington Commanders",
};

const NHL_TEAMS: Record<string, string> = {
  "ducks": "Anaheim Ducks", "ana": "Anaheim Ducks",
  "coyotes": "Arizona Coyotes", "ari": "Arizona Coyotes",
  "bruins": "Boston Bruins", "bos": "Boston Bruins",
  "sabres": "Buffalo Sabres", "buf": "Buffalo Sabres",
  "flames": "Calgary Flames", "cgy": "Calgary Flames",
  "hurricanes": "Carolina Hurricanes", "car": "Carolina Hurricanes",
  "blackhawks": "Chicago Blackhawks", "chi": "Chicago Blackhawks",
  "avalanche": "Colorado Avalanche", "col": "Colorado Avalanche",
  "blue jackets": "Columbus Blue Jackets", "cbj": "Columbus Blue Jackets",
  "stars": "Dallas Stars", "dal": "Dallas Stars",
  "red wings": "Detroit Red Wings", "det": "Detroit Red Wings",
  "oilers": "Edmonton Oilers", "edm": "Edmonton Oilers",
  "panthers": "Florida Panthers", "fla": "Florida Panthers",
  "kings": "Los Angeles Kings", "lak": "Los Angeles Kings",
  "wild": "Minnesota Wild", "min": "Minnesota Wild",
  "canadiens": "Montreal Canadiens", "habs": "Montreal Canadiens", "mtl": "Montreal Canadiens",
  "predators": "Nashville Predators", "preds": "Nashville Predators", "nsh": "Nashville Predators",
  "devils": "New Jersey Devils", "njd": "New Jersey Devils",
  "islanders": "New York Islanders", "nyi": "New York Islanders",
  "rangers": "New York Rangers", "nyr": "New York Rangers",
  "senators": "Ottawa Senators", "ott": "Ottawa Senators",
  "flyers": "Philadelphia Flyers", "phi": "Philadelphia Flyers",
  "penguins": "Pittsburgh Penguins", "pit": "Pittsburgh Penguins",
  "sharks": "San Jose Sharks", "sjs": "San Jose Sharks",
  "kraken": "Seattle Kraken", "sea": "Seattle Kraken",
  "blues": "St. Louis Blues", "stl": "St. Louis Blues",
  "lightning": "Tampa Bay Lightning", "tb": "Tampa Bay Lightning",
  "maple leafs": "Toronto Maple Leafs", "leafs": "Toronto Maple Leafs", "tor": "Toronto Maple Leafs",
  "utah hockey club": "Utah Hockey Club", "uta": "Utah Hockey Club",
  "canucks": "Vancouver Canucks", "van": "Vancouver Canucks",
  "golden knights": "Vegas Golden Knights", "vgk": "Vegas Golden Knights",
  "capitals": "Washington Capitals", "was": "Washington Capitals", "caps": "Washington Capitals",
  "jets": "Winnipeg Jets", "wpg": "Winnipeg Jets",
};

const SPORT_TEAM_MAPS: Record<string, Record<string, string>> = {
  MLB: MLB_TEAMS,
  NBA: NBA_TEAMS,
  NFL: NFL_TEAMS,
  NHL: NHL_TEAMS,
};

/**
 * Normalize a team name to its full ESPN name using the sport context.
 * Returns the original name if no match found.
 */
export function normalizeTeamName(name: string, sport: string): string {
  const map = SPORT_TEAM_MAPS[sport.toUpperCase()];
  if (!map) return name;

  const lower = name.toLowerCase().trim();

  // Direct lookup
  if (map[lower]) return map[lower];

  // Try matching against full names (case-insensitive)
  for (const fullName of Object.values(map)) {
    if (fullName.toLowerCase() === lower) return fullName;
  }

  // Try partial match — check if the short name appears in any full name
  for (const [short, full] of Object.entries(map)) {
    if (lower.includes(short) || short.includes(lower)) return full;
  }

  return name;
}

/**
 * Check if two team names refer to the same team.
 */
export function teamsMatch(name1: string, name2: string, sport: string): boolean {
  const n1 = normalizeTeamName(name1, sport).toLowerCase();
  const n2 = normalizeTeamName(name2, sport).toLowerCase();

  if (n1 === n2) return true;

  // Also check if one contains the other's last word (e.g., "Mets" in "New York Mets")
  const words1 = n1.split(" ");
  const words2 = n2.split(" ");
  const last1 = words1[words1.length - 1];
  const last2 = words2[words2.length - 1];

  return n2.includes(last1) || n1.includes(last2);
}

/**
 * Parse a pick text to extract the team name and bet type.
 *
 * Examples:
 * - "Lakers -3.5"     → { team: "Lakers", betType: "spread", line: -3.5 }
 * - "Over 219.5"      → { team: null, betType: "over", line: 219.5 }
 * - "Under 7.5"       → { team: null, betType: "under", line: 7.5 }
 * - "Mets ML"         → { team: "Mets", betType: "moneyline" }
 * - "Tigers F5 ML"    → { team: "Tigers", betType: "f5_moneyline" }
 * - "Lakers 1H -3.5"  → { team: "Lakers", betType: "1h_spread", line: -3.5 }
 * - "Over 1Q 55.5"    → { team: null, betType: "1q_over", line: 55.5 }
 * - "Parlay ..."      → { team: null, betType: "parlay" }
 */
export type ParsedPick = {
  team: string | null;
  betType:
    | "moneyline"
    | "spread"
    | "over"
    | "under"
    | "f5_moneyline"
    | "f5_spread"
    | "f5_over"
    | "f5_under"
    | "1h_moneyline"
    | "1h_spread"
    | "1h_over"
    | "1h_under"
    | "1q_moneyline"
    | "1q_spread"
    | "1q_over"
    | "1q_under"
    | "parlay"
    | "player_prop"
    | "unknown";
  line: number | null;
};

export function parsePick(pickText: string): ParsedPick {
  const text = pickText.trim();
  const lower = text.toLowerCase();

  // Parlays
  if (lower.includes("parlay") || lower.includes("sgp")) {
    return { team: null, betType: "parlay", line: null };
  }

  // Player props (look for common prop keywords)
  const propKeywords = ["pts", "reb", "ast", "strikeouts", "hits", "hr", "rbi", "yards", "tds", "touchdowns", "goals", "assists", "saves", "sog", "shots"];
  if (propKeywords.some((kw) => lower.includes(kw))) {
    return { team: null, betType: "player_prop", line: null };
  }

  // Detect period modifiers
  let period: "" | "f5_" | "1h_" | "1q_" = "";
  let workText = text;

  if (/\bF5\b/i.test(workText)) {
    period = "f5_";
    workText = workText.replace(/\bF5\b/i, "").trim();
  } else if (/\b1H\b/i.test(workText)) {
    period = "1h_";
    workText = workText.replace(/\b1H\b/i, "").trim();
  } else if (/\b1Q\b/i.test(workText)) {
    period = "1q_";
    workText = workText.replace(/\b1Q\b/i, "").trim();
  }

  // Over/Under
  const overMatch = workText.match(/^over\s+([\d.]+)/i);
  if (overMatch) {
    return { team: null, betType: `${period}over` as ParsedPick["betType"], line: parseFloat(overMatch[1]) };
  }

  const underMatch = workText.match(/^under\s+([\d.]+)/i);
  if (underMatch) {
    return { team: null, betType: `${period}under` as ParsedPick["betType"], line: parseFloat(underMatch[1]) };
  }

  // Team Over/Under (e.g., "Mets Over 4.5")
  const teamOverMatch = workText.match(/^(.+?)\s+over\s+([\d.]+)/i);
  if (teamOverMatch) {
    return { team: teamOverMatch[1].trim(), betType: `${period}over` as ParsedPick["betType"], line: parseFloat(teamOverMatch[2]) };
  }

  const teamUnderMatch = workText.match(/^(.+?)\s+under\s+([\d.]+)/i);
  if (teamUnderMatch) {
    return { team: teamUnderMatch[1].trim(), betType: `${period}under` as ParsedPick["betType"], line: parseFloat(teamUnderMatch[2]) };
  }

  // Moneyline
  if (/\bML\b/i.test(workText)) {
    const team = workText.replace(/\bML\b/i, "").trim();
    return { team: team || null, betType: `${period}moneyline` as ParsedPick["betType"], line: null };
  }

  // Spread (e.g., "Lakers -3.5", "Celtics +5.5")
  const spreadMatch = workText.match(/^(.+?)\s+([+-][\d.]+)$/);
  if (spreadMatch) {
    return {
      team: spreadMatch[1].trim(),
      betType: `${period}spread` as ParsedPick["betType"],
      line: parseFloat(spreadMatch[2]),
    };
  }

  // If just a team name with no modifier, assume moneyline
  if (workText.length > 0 && !/\d/.test(workText)) {
    return { team: workText, betType: `${period}moneyline` as ParsedPick["betType"], line: null };
  }

  return { team: null, betType: "unknown", line: null };
}
