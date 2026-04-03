export interface TeamLogo {
  name: string;
  abbr: string;
  url: string;
  sport: string;
  league: string;
}

const espn = (sport: string, abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/${sport}/500/${abbr}.png`;

// ── NFL (32 teams) ──
const NFL: TeamLogo[] = [
  ["Arizona Cardinals","ARI"],["Atlanta Falcons","ATL"],["Baltimore Ravens","BAL"],
  ["Buffalo Bills","BUF"],["Carolina Panthers","CAR"],["Chicago Bears","CHI"],
  ["Cincinnati Bengals","CIN"],["Cleveland Browns","CLE"],["Dallas Cowboys","DAL"],
  ["Denver Broncos","DEN"],["Detroit Lions","DET"],["Green Bay Packers","GB"],
  ["Houston Texans","HOU"],["Indianapolis Colts","IND"],["Jacksonville Jaguars","JAX"],
  ["Kansas City Chiefs","KC"],["Las Vegas Raiders","LV"],["Los Angeles Chargers","LAC"],
  ["Los Angeles Rams","LAR"],["Miami Dolphins","MIA"],["Minnesota Vikings","MIN"],
  ["New England Patriots","NE"],["New Orleans Saints","NO"],["New York Giants","NYG"],
  ["New York Jets","NYJ"],["Philadelphia Eagles","PHI"],["Pittsburgh Steelers","PIT"],
  ["San Francisco 49ers","SF"],["Seattle Seahawks","SEA"],["Tampa Bay Buccaneers","TB"],
  ["Tennessee Titans","TEN"],["Washington Commanders","WSH"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("nfl", a.toLowerCase()), sport: "nfl", league: "NFL" }));

// ── MLB (30 teams) ──
const MLB: TeamLogo[] = [
  ["Arizona Diamondbacks","ARI"],["Atlanta Braves","ATL"],["Baltimore Orioles","BAL"],
  ["Boston Red Sox","BOS"],["Chicago Cubs","CHC"],["Chicago White Sox","CHW"],
  ["Cincinnati Reds","CIN"],["Cleveland Guardians","CLE"],["Colorado Rockies","COL"],
  ["Detroit Tigers","DET"],["Houston Astros","HOU"],["Kansas City Royals","KC"],
  ["Los Angeles Angels","LAA"],["Los Angeles Dodgers","LAD"],["Miami Marlins","MIA"],
  ["Milwaukee Brewers","MIL"],["Minnesota Twins","MIN"],["New York Mets","NYM"],
  ["New York Yankees","NYY"],["Oakland Athletics","OAK"],["Philadelphia Phillies","PHI"],
  ["Pittsburgh Pirates","PIT"],["San Diego Padres","SD"],["San Francisco Giants","SF"],
  ["Seattle Mariners","SEA"],["St. Louis Cardinals","STL"],["Tampa Bay Rays","TB"],
  ["Texas Rangers","TEX"],["Toronto Blue Jays","TOR"],["Washington Nationals","WSH"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("mlb", a.toLowerCase()), sport: "mlb", league: "MLB" }));

// ── NBA (30 teams) ──
const NBA: TeamLogo[] = [
  ["Atlanta Hawks","ATL"],["Boston Celtics","BOS"],["Brooklyn Nets","BKN"],
  ["Charlotte Hornets","CHA"],["Chicago Bulls","CHI"],["Cleveland Cavaliers","CLE"],
  ["Dallas Mavericks","DAL"],["Denver Nuggets","DEN"],["Detroit Pistons","DET"],
  ["Golden State Warriors","GS"],["Houston Rockets","HOU"],["Indiana Pacers","IND"],
  ["Los Angeles Clippers","LAC"],["Los Angeles Lakers","LAL"],["Memphis Grizzlies","MEM"],
  ["Miami Heat","MIA"],["Milwaukee Bucks","MIL"],["Minnesota Timberwolves","MIN"],
  ["New Orleans Pelicans","NO"],["New York Knicks","NY"],["Oklahoma City Thunder","OKC"],
  ["Orlando Magic","ORL"],["Philadelphia 76ers","PHI"],["Phoenix Suns","PHX"],
  ["Portland Trail Blazers","POR"],["Sacramento Kings","SAC"],["San Antonio Spurs","SA"],
  ["Toronto Raptors","TOR"],["Utah Jazz","UTAH"],["Washington Wizards","WSH"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("nba", a.toLowerCase()), sport: "nba", league: "NBA" }));

// ── NHL (32 teams) ──
const NHL: TeamLogo[] = [
  ["Anaheim Ducks","ANA"],["Boston Bruins","BOS"],["Buffalo Sabres","BUF"],
  ["Calgary Flames","CGY"],["Carolina Hurricanes","CAR"],["Chicago Blackhawks","CHI"],
  ["Colorado Avalanche","COL"],["Columbus Blue Jackets","CBJ"],["Dallas Stars","DAL"],
  ["Detroit Red Wings","DET"],["Edmonton Oilers","EDM"],["Florida Panthers","FLA"],
  ["Los Angeles Kings","LA"],["Minnesota Wild","MIN"],["Montreal Canadiens","MTL"],
  ["Nashville Predators","NSH"],["New Jersey Devils","NJ"],["New York Islanders","NYI"],
  ["New York Rangers","NYR"],["Ottawa Senators","OTT"],["Philadelphia Flyers","PHI"],
  ["Pittsburgh Penguins","PIT"],["San Jose Sharks","SJ"],["Seattle Kraken","SEA"],
  ["St. Louis Blues","STL"],["Tampa Bay Lightning","TB"],["Toronto Maple Leafs","TOR"],
  ["Utah Hockey Club","UTAH"],["Vancouver Canucks","VAN"],["Vegas Golden Knights","VGK"],
  ["Washington Capitals","WSH"],["Winnipeg Jets","WPG"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("nhl", a.toLowerCase()), sport: "nhl", league: "NHL" }));

// ── Premier League (20 teams) — uses ESPN soccer IDs ──
const EPL: TeamLogo[] = [
  ["Arsenal","ARS","359"],["Aston Villa","AVL","362"],["Bournemouth","BOU","349"],
  ["Brentford","BRE","337"],["Brighton","BHA","331"],["Chelsea","CHE","363"],
  ["Crystal Palace","CRY","384"],["Everton","EVE","368"],["Fulham","FUL","370"],
  ["Ipswich Town","IPS","373"],["Leicester City","LEI","375"],["Liverpool","LIV","364"],
  ["Manchester City","MCI","382"],["Manchester United","MUN","360"],["Newcastle","NEW","361"],
  ["Nottingham Forest","NFO","393"],["Southampton","SOU","376"],["Tottenham","TOT","367"],
  ["West Ham","WHU","371"],["Wolverhampton","WOL","380"],
].map(([n, a, id]) => ({ name: n, abbr: a, url: `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`, sport: "soccer", league: "Premier League" }));

// ── La Liga (20 teams) ──
const LALIGA: TeamLogo[] = [
  ["Athletic Bilbao","ATH","93"],["Atletico Madrid","ATM","1068"],["Barcelona","BAR","83"],
  ["Real Betis","BET","244"],["Celta Vigo","CEL","3842"],["Espanyol","ESP","88"],
  ["Getafe","GET","3987"],["Girona","GIR","9812"],["Las Palmas","LPA","3843"],
  ["Leganes","LEG","6553"],["Mallorca","MLL","3852"],["Osasuna","OSA","97"],
  ["Rayo Vallecano","RAY","3849"],["Real Madrid","RMA","86"],["Real Sociedad","RSO","89"],
  ["Real Valladolid","VLD","3851"],["Sevilla","SEV","243"],["Valencia","VAL","94"],
  ["Villarreal","VIL","102"],["Deportivo Alaves","ALA","96"],
].map(([n, a, id]) => ({ name: n, abbr: a, url: `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`, sport: "soccer", league: "La Liga" }));

// ── MLS (29 teams) ──
const MLS: TeamLogo[] = [
  ["Atlanta United","ATL","18512"],["Austin FC","AUS","23586"],["Charlotte FC","CLT","24020"],
  ["Chicago Fire","CHI","197"],["Cincinnati","CIN","21289"],["Colorado Rapids","COL","178"],
  ["Columbus Crew","CLB","183"],["D.C. United","DC","184"],["Dallas","DAL","185"],
  ["Houston Dynamo","HOU","199"],["Inter Miami","MIA","22155"],["LA Galaxy","LA","187"],
  ["LAFC","LAFC","21504"],["Minnesota United","MIN","19256"],["Montreal","MTL","18515"],
  ["Nashville SC","NSH","22151"],["New England","NE","189"],["New York City FC","NYC","17362"],
  ["New York Red Bulls","NYRB","190"],["Orlando City","ORL","14892"],["Philadelphia","PHI","4418"],
  ["Portland Timbers","POR","9498"],["Real Salt Lake","RSL","192"],["San Jose","SJ","193"],
  ["Seattle Sounders","SEA","9497"],["Sporting KC","SKC","194"],["St. Louis City","STL","24115"],
  ["Toronto FC","TOR","9515"],["Vancouver","VAN","9519"],
].map(([n, a, id]) => ({ name: n, abbr: a, url: `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`, sport: "soccer", league: "MLS" }));

// ── NCAAF (top 25 programs) ──
const NCAAF: TeamLogo[] = [
  ["Alabama","ALA"],["Ohio State","OSU"],["Georgia","UGA"],["Michigan","MICH"],
  ["Texas","TEX"],["USC","USC"],["LSU","LSU"],["Clemson","CLEM"],
  ["Oregon","ORE"],["Penn State","PSU"],["Florida State","FSU"],["Oklahoma","OU"],
  ["Notre Dame","ND"],["Tennessee","TENN"],["Miami","MIA"],["Florida","FLA"],
  ["Auburn","AUB"],["Wisconsin","WIS"],["Iowa","IOWA"],["Michigan State","MSU"],
  ["Texas A&M","TAMU"],["UCLA","UCLA"],["Utah","UTAH"],["Washington","WASH"],
  ["Ole Miss","MISS"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("ncaa", a.toLowerCase()), sport: "ncaaf", league: "NCAAF" }));

// ── NCAAB (top 25 programs) ──
const NCAAB: TeamLogo[] = [
  ["Duke","DUKE"],["North Carolina","UNC"],["Kentucky","UK"],["Kansas","KU"],
  ["Gonzaga","GONZ"],["Villanova","VILL"],["UConn","UCONN"],["Michigan State","MSU"],
  ["Purdue","PUR"],["Houston","HOU"],["Arizona","ARIZ"],["Creighton","CREI"],
  ["Marquette","MARQ"],["Tennessee","TENN"],["Baylor","BAY"],["Alabama","ALA"],
  ["Indiana","IND"],["Iowa State","ISU"],["Auburn","AUB"],["Texas","TEX"],
].map(([n, a]) => ({ name: n, abbr: a, url: espn("ncaa", a.toLowerCase()), sport: "ncaab", league: "NCAAB" }));

// ── All teams combined ──
export const TEAM_LOGOS: TeamLogo[] = [
  ...NFL, ...MLB, ...NBA, ...NHL, ...EPL, ...LALIGA, ...MLS, ...NCAAF, ...NCAAB,
];

// ── Get all unique leagues ──
export function getLeaguesForSport(sportFilter?: string): string[] {
  const logos = sportFilter ? TEAM_LOGOS.filter((t) => t.sport === sportFilter) : TEAM_LOGOS;
  return [...new Set(logos.map((t) => t.league))];
}

/**
 * Search teams by name, abbreviation, sport, or league.
 */
export function searchTeams(query: string, sportFilter?: string, leagueFilter?: string): TeamLogo[] {
  const q = query.toLowerCase().trim();
  let results = TEAM_LOGOS;

  if (sportFilter) {
    results = results.filter((t) => t.sport === sportFilter);
  }
  if (leagueFilter) {
    results = results.filter((t) => t.league === leagueFilter);
  }
  if (q) {
    results = results.filter(
      (t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q)
    );
  }

  return results.slice(0, 24);
}

/**
 * Fetch an image through our server-side proxy to avoid CORS issues.
 * Falls back to direct fetch if proxy fails.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  try {
    // Use our proxy to avoid CORS
    const proxyUrl = `/api/admin/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Proxy failed");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Last resort: return the URL directly (preview works, export may not)
    return url;
  }
}
