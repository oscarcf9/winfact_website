/**
 * Team visual data for victory post generation.
 * Maps team names to brand colors (descriptive + hex) for AI image prompts and compositing.
 */

import { parsePick } from "@/lib/team-normalizer";

export type TeamVisualData = {
  teamName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryHex: string;
  secondaryHex: string;
  sport: "NBA" | "MLB" | "NFL" | "NHL" | "Soccer" | "NCAAF" | "NCAAB";
  league?: string;
};

// Helper to reduce repetition
function tv(
  teamName: string,
  city: string,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  primaryHex: string,
  secondaryHex: string,
  sport: TeamVisualData["sport"],
  league?: string,
): TeamVisualData {
  return { teamName, city, primaryColor, secondaryColor, accentColor, primaryHex, secondaryHex, sport, league };
}

/**
 * Team visuals record. Keys match common pick text names.
 *
 * Duplicate key handling: when the same nickname exists in multiple sports,
 * the more common sport keeps the plain key; the less common sport gets a
 * prefixed key (e.g. "ARI Cardinals" for NFL, "Cardinals" stays MLB).
 * The resolver iterates all entries with sport filtering to handle this.
 */
export const TEAM_VISUALS: Record<string, TeamVisualData> = {
  // ═══════════════════════════════════════════════════════════
  // NBA (30 teams)
  // ═══════════════════════════════════════════════════════════
  Hawks:       tv("Hawks", "Atlanta", "torch red", "volt green", "white", "#C8102E", "#9EA2A2", "NBA"),
  Celtics:     tv("Celtics", "Boston", "kelly green", "white", "gold", "#007A33", "#BA9653", "NBA"),
  Nets:        tv("Nets", "Brooklyn", "black", "white", "gray", "#000000", "#FFFFFF", "NBA"),
  Hornets:     tv("Hornets", "Charlotte", "teal", "dark purple", "gray", "#1D1160", "#00788C", "NBA"),
  Bulls:       tv("Bulls", "Chicago", "red", "black", "white", "#CE1141", "#000000", "NBA"),
  Cavaliers:   tv("Cavaliers", "Cleveland", "wine", "gold", "navy", "#860038", "#FDBB30", "NBA"),
  Mavericks:   tv("Mavericks", "Dallas", "royal blue", "navy", "silver", "#00538C", "#002B5E", "NBA"),
  Nuggets:     tv("Nuggets", "Denver", "midnight blue", "sunshine gold", "rust", "#0E2240", "#FEC524", "NBA"),
  Pistons:     tv("Pistons", "Detroit", "red", "royal blue", "white", "#C8102E", "#1D42BA", "NBA"),
  Warriors:    tv("Warriors", "Golden State", "royal blue", "golden yellow", "white", "#1D428A", "#FFC72C", "NBA"),
  Rockets:     tv("Rockets", "Houston", "red", "black", "white", "#CE1141", "#000000", "NBA"),
  Pacers:      tv("Pacers", "Indiana", "navy", "gold", "gray", "#002D62", "#FDBB30", "NBA"),
  Clippers:    tv("Clippers", "Los Angeles", "red", "royal blue", "white", "#C8102E", "#1D428A", "NBA"),
  Lakers:      tv("Lakers", "Los Angeles", "purple", "gold", "white", "#552583", "#FDB927", "NBA"),
  Grizzlies:   tv("Grizzlies", "Memphis", "midnight blue", "beale street blue", "gold", "#12173F", "#5D76A9", "NBA"),
  Heat:        tv("Heat", "Miami", "black", "dark red", "yellow", "#98002E", "#F9A01B", "NBA"),
  Bucks:       tv("Bucks", "Milwaukee", "hunter green", "cream", "blue", "#00471B", "#EEE1C6", "NBA"),
  Timberwolves: tv("Timberwolves", "Minnesota", "midnight blue", "aurora green", "gray", "#0C2340", "#236192", "NBA"),
  Pelicans:    tv("Pelicans", "New Orleans", "navy", "gold", "red", "#0C2340", "#C8102E", "NBA"),
  Knicks:      tv("Knicks", "New York", "blue", "orange", "silver", "#006BB6", "#F58426", "NBA"),
  Thunder:     tv("Thunder", "Oklahoma City", "blue", "orange", "yellow", "#007AC1", "#EF6100", "NBA"),
  Magic:       tv("Magic", "Orlando", "blue", "black", "white", "#0077C0", "#C4CED4", "NBA"),
  "76ers":     tv("76ers", "Philadelphia", "blue", "red", "white", "#006BB6", "#ED174C", "NBA"),
  Suns:        tv("Suns", "Phoenix", "purple", "orange", "black", "#1D1160", "#E56020", "NBA"),
  "Trail Blazers": tv("Trail Blazers", "Portland", "red", "black", "white", "#E03A3E", "#000000", "NBA"),
  "SAC Kings": tv("Kings", "Sacramento", "purple", "silver", "black", "#5A2D81", "#63727A", "NBA"),
  Spurs:       tv("Spurs", "San Antonio", "silver", "black", "white", "#C4CED4", "#000000", "NBA"),
  Raptors:     tv("Raptors", "Toronto", "red", "black", "silver", "#CE1141", "#000000", "NBA"),
  Jazz:        tv("Jazz", "Utah", "navy", "gold", "green", "#002B5C", "#00471B", "NBA"),
  Wizards:     tv("Wizards", "Washington", "navy", "red", "silver", "#002B5C", "#E31837", "NBA"),

  // ═══════════════════════════════════════════════════════════
  // MLB (30 teams)
  // ═══════════════════════════════════════════════════════════
  Diamondbacks: tv("Diamondbacks", "Arizona", "sedona red", "teal", "black", "#A71930", "#E3D4AD", "MLB"),
  Braves:       tv("Braves", "Atlanta", "navy", "scarlet red", "white", "#CE1141", "#13274F", "MLB"),
  Orioles:      tv("Orioles", "Baltimore", "orange", "black", "white", "#DF4601", "#000000", "MLB"),
  "Red Sox":    tv("Red Sox", "Boston", "red", "navy", "white", "#BD3039", "#0C2340", "MLB"),
  Cubs:         tv("Cubs", "Chicago", "blue", "red", "white", "#0E3386", "#CC3433", "MLB"),
  "White Sox":  tv("White Sox", "Chicago", "black", "silver", "white", "#27251F", "#C4CED4", "MLB"),
  Reds:         tv("Reds", "Cincinnati", "red", "white", "black", "#C6011F", "#000000", "MLB"),
  Guardians:    tv("Guardians", "Cleveland", "navy", "red", "white", "#00385D", "#E50022", "MLB"),
  Rockies:      tv("Rockies", "Colorado", "purple", "black", "silver", "#33006F", "#C4CED4", "MLB"),
  Tigers:       tv("Tigers", "Detroit", "navy", "orange", "white", "#0C2340", "#FA4616", "MLB"),
  Astros:       tv("Astros", "Houston", "navy", "orange", "white", "#002D62", "#EB6E1F", "MLB"),
  Royals:       tv("Royals", "Kansas City", "royal blue", "white", "gold", "#004687", "#BD9B60", "MLB"),
  Angels:       tv("Angels", "Los Angeles", "red", "white", "silver", "#BA0021", "#003263", "MLB"),
  Dodgers:      tv("Dodgers", "Los Angeles", "dodger blue", "white", "red", "#005A9C", "#EF3E42", "MLB"),
  Marlins:      tv("Marlins", "Miami", "black", "blue", "red", "#00A3E0", "#EF3340", "MLB"),
  Brewers:      tv("Brewers", "Milwaukee", "navy", "gold", "white", "#12284B", "#FFC52F", "MLB"),
  Twins:        tv("Twins", "Minnesota", "navy", "red", "white", "#002B5C", "#D31145", "MLB"),
  Mets:         tv("Mets", "New York", "blue", "orange", "white", "#002D72", "#FF5910", "MLB"),
  Yankees:      tv("Yankees", "New York", "navy", "white", "gray", "#003087", "#C4CED4", "MLB"),
  Athletics:    tv("Athletics", "Oakland", "green", "gold", "white", "#003831", "#EFB21E", "MLB"),
  Phillies:     tv("Phillies", "Philadelphia", "red", "blue", "white", "#E81828", "#002D72", "MLB"),
  Pirates:      tv("Pirates", "Pittsburgh", "black", "gold", "white", "#27251F", "#FDB827", "MLB"),
  Padres:       tv("Padres", "San Diego", "brown", "gold", "white", "#2F241D", "#FFC425", "MLB"),
  Giants:       tv("Giants", "San Francisco", "orange", "black", "cream", "#FD5A1E", "#27251F", "MLB"),
  Mariners:     tv("Mariners", "Seattle", "navy", "teal", "silver", "#0C2C56", "#005C5C", "MLB"),
  Cardinals:    tv("Cardinals", "St. Louis", "red", "navy", "white", "#C41E3A", "#0C2340", "MLB"),
  Rays:         tv("Rays", "Tampa Bay", "navy", "columbia blue", "yellow", "#092C5C", "#8FBCE6", "MLB"),
  "TEX Rangers": tv("Rangers", "Texas", "blue", "red", "white", "#003278", "#C0111F", "MLB"),
  "Blue Jays":  tv("Blue Jays", "Toronto", "royal blue", "navy", "red", "#134A8E", "#1D2D5C", "MLB"),
  Nationals:    tv("Nationals", "Washington", "red", "navy", "white", "#AB0003", "#14225A", "MLB"),

  // ═══════════════════════════════════════════════════════════
  // NFL (32 teams)
  // ═══════════════════════════════════════════════════════════
  "ARI Cardinals": tv("Cardinals", "Arizona", "cardinal red", "white", "black", "#97233F", "#000000", "NFL"),
  Falcons:      tv("Falcons", "Atlanta", "black", "red", "silver", "#A71930", "#000000", "NFL"),
  Ravens:       tv("Ravens", "Baltimore", "purple", "gold", "black", "#241773", "#9E7C0C", "NFL"),
  Bills:        tv("Bills", "Buffalo", "royal blue", "red", "white", "#00338D", "#C60C30", "NFL"),
  "CAR Panthers": tv("Panthers", "Carolina", "panther blue", "silver", "black", "#0085CA", "#101820", "NFL"),
  Bears:        tv("Bears", "Chicago", "navy", "orange", "white", "#0B162A", "#C83803", "NFL"),
  Bengals:      tv("Bengals", "Cincinnati", "orange", "black", "white", "#FB4F14", "#000000", "NFL"),
  Browns:       tv("Browns", "Cleveland", "brown", "orange", "white", "#311D00", "#FF3C00", "NFL"),
  Cowboys:      tv("Cowboys", "Dallas", "navy blue", "silver", "white", "#003594", "#869397", "NFL"),
  Broncos:      tv("Broncos", "Denver", "orange", "navy", "white", "#FB4F14", "#002244", "NFL"),
  Lions:        tv("Lions", "Detroit", "honolulu blue", "silver", "white", "#0076B6", "#B0B7BC", "NFL"),
  Packers:      tv("Packers", "Green Bay", "green", "gold", "white", "#203731", "#FFB612", "NFL"),
  Texans:       tv("Texans", "Houston", "deep steel blue", "battle red", "white", "#03202F", "#A71930", "NFL"),
  Colts:        tv("Colts", "Indianapolis", "royal blue", "white", "gray", "#002C5F", "#A2AAAD", "NFL"),
  Jaguars:      tv("Jaguars", "Jacksonville", "teal", "gold", "black", "#006778", "#9F792C", "NFL"),
  Chiefs:       tv("Chiefs", "Kansas City", "red", "gold", "white", "#E31837", "#FFB81C", "NFL"),
  Raiders:      tv("Raiders", "Las Vegas", "silver", "black", "white", "#A5ACAF", "#000000", "NFL"),
  Chargers:     tv("Chargers", "Los Angeles", "powder blue", "gold", "navy", "#0080C6", "#FFC20E", "NFL"),
  Rams:         tv("Rams", "Los Angeles", "royal blue", "sol yellow", "white", "#003594", "#FFA300", "NFL"),
  Dolphins:     tv("Dolphins", "Miami", "aqua", "orange", "white", "#008E97", "#FC4C02", "NFL"),
  Vikings:      tv("Vikings", "Minnesota", "purple", "gold", "white", "#4F2683", "#FFC62F", "NFL"),
  Patriots:     tv("Patriots", "New England", "navy", "red", "silver", "#002244", "#C60C30", "NFL"),
  Saints:       tv("Saints", "New Orleans", "black", "old gold", "white", "#D3BC8D", "#101820", "NFL"),
  "NY Giants":  tv("Giants", "New York", "blue", "red", "white", "#0B2265", "#A71930", "NFL"),
  "NY Jets":    tv("Jets", "New York", "gotham green", "white", "black", "#125740", "#000000", "NFL"),
  Eagles:       tv("Eagles", "Philadelphia", "midnight green", "silver", "black", "#004C54", "#A5ACAF", "NFL"),
  Steelers:     tv("Steelers", "Pittsburgh", "black", "gold", "white", "#FFB612", "#101820", "NFL"),
  "49ers":      tv("49ers", "San Francisco", "scarlet red", "gold", "white", "#AA0000", "#B3995D", "NFL"),
  Seahawks:     tv("Seahawks", "Seattle", "action green", "navy", "gray", "#002244", "#69BE28", "NFL"),
  Buccaneers:   tv("Buccaneers", "Tampa Bay", "red", "pewter", "black", "#D50A0A", "#FF7900", "NFL"),
  Titans:       tv("Titans", "Tennessee", "navy", "titans blue", "red", "#0C2340", "#4B92DB", "NFL"),
  Commanders:   tv("Commanders", "Washington", "burgundy", "gold", "white", "#5A1414", "#FFB612", "NFL"),

  // ═══════════════════════════════════════════════════════════
  // NHL (32 teams)
  // ═══════════════════════════════════════════════════════════
  Ducks:        tv("Ducks", "Anaheim", "orange", "black", "gold", "#F47A38", "#B9975B", "NHL"),
  Bruins:       tv("Bruins", "Boston", "black", "gold", "white", "#FFB81C", "#000000", "NHL"),
  Sabres:       tv("Sabres", "Buffalo", "navy", "gold", "white", "#002654", "#FCB514", "NHL"),
  Flames:       tv("Flames", "Calgary", "red", "gold", "black", "#D2001C", "#FAAF19", "NHL"),
  Hurricanes:   tv("Hurricanes", "Carolina", "red", "black", "gray", "#CC0000", "#000000", "NHL"),
  Blackhawks:   tv("Blackhawks", "Chicago", "red", "black", "white", "#CF0A2C", "#000000", "NHL"),
  Avalanche:    tv("Avalanche", "Colorado", "burgundy", "steel blue", "black", "#6F263D", "#236192", "NHL"),
  "Blue Jackets": tv("Blue Jackets", "Columbus", "navy", "red", "white", "#002654", "#CE1126", "NHL"),
  Stars:        tv("Stars", "Dallas", "victory green", "silver", "black", "#006847", "#8F8F8C", "NHL"),
  "Red Wings":  tv("Red Wings", "Detroit", "red", "white", "black", "#CE1126", "#FFFFFF", "NHL"),
  Oilers:       tv("Oilers", "Edmonton", "orange", "navy", "white", "#041E42", "#FF4C00", "NHL"),
  Panthers:     tv("Panthers", "Florida", "red", "navy", "gold", "#041E42", "#C8102E", "NHL"),
  Kings:        tv("Kings", "Los Angeles", "silver", "black", "white", "#111111", "#A2AAAD", "NHL"),
  Wild:         tv("Wild", "Minnesota", "forest green", "red", "cream", "#154734", "#A6192E", "NHL"),
  Canadiens:    tv("Canadiens", "Montreal", "red", "blue", "white", "#AF1E2D", "#192168", "NHL"),
  Predators:    tv("Predators", "Nashville", "gold", "navy", "white", "#FFB81C", "#041E42", "NHL"),
  Devils:       tv("Devils", "New Jersey", "red", "black", "white", "#CE1126", "#000000", "NHL"),
  Islanders:    tv("Islanders", "New York", "blue", "orange", "white", "#00539B", "#F47D30", "NHL"),
  Rangers:      tv("Rangers", "New York", "blue", "red", "white", "#0038A8", "#CE1126", "NHL"),
  Senators:     tv("Senators", "Ottawa", "red", "black", "gold", "#C52032", "#C2912C", "NHL"),
  Flyers:       tv("Flyers", "Philadelphia", "orange", "black", "white", "#F74902", "#000000", "NHL"),
  Penguins:     tv("Penguins", "Pittsburgh", "black", "gold", "white", "#000000", "#FCB514", "NHL"),
  Sharks:       tv("Sharks", "San Jose", "teal", "black", "orange", "#006D75", "#EA7200", "NHL"),
  Kraken:       tv("Kraken", "Seattle", "deep sea blue", "ice blue", "red", "#001628", "#99D9D9", "NHL"),
  Blues:        tv("Blues", "St. Louis", "blue", "gold", "navy", "#002F87", "#FCB514", "NHL"),
  Lightning:    tv("Lightning", "Tampa Bay", "blue", "white", "black", "#002868", "#FFFFFF", "NHL"),
  "Maple Leafs": tv("Maple Leafs", "Toronto", "blue", "white", "navy", "#00205B", "#FFFFFF", "NHL"),
  "Utah Hockey Club": tv("Utah Hockey Club", "Salt Lake City", "rock black", "mountain blue", "white", "#010101", "#6CACE4", "NHL"),
  Canucks:      tv("Canucks", "Vancouver", "blue", "green", "white", "#00205B", "#00843D", "NHL"),
  "Golden Knights": tv("Golden Knights", "Las Vegas", "gold", "steel gray", "red", "#B4975A", "#333F42", "NHL"),
  Capitals:     tv("Capitals", "Washington", "red", "navy", "white", "#C8102E", "#041E42", "NHL"),
  Jets:         tv("Jets", "Winnipeg", "navy", "aviator blue", "red", "#041E42", "#004C97", "NHL"),

  // ═══════════════════════════════════════════════════════════
  // Soccer
  // ═══════════════════════════════════════════════════════════

  // --- La Liga ---
  "Real Madrid": tv("Real Madrid", "Madrid", "white", "gold", "navy", "#FFFFFF", "#FEBE10", "Soccer", "La Liga"),
  Barcelona:     tv("Barcelona", "Barcelona", "blaugrana blue", "garnet red", "gold", "#004D98", "#A50044", "Soccer", "La Liga"),
  "Atletico Madrid": tv("Atletico Madrid", "Madrid", "red", "white", "navy", "#CE1126", "#27408B", "Soccer", "La Liga"),
  "Athletic Club": tv("Athletic Club", "Bilbao", "red", "white", "black", "#EE2523", "#FFFFFF", "Soccer", "La Liga"),
  Villarreal:    tv("Villarreal", "Villarreal", "yellow", "navy", "white", "#FFE114", "#005187", "Soccer", "La Liga"),

  // --- Premier League ---
  Arsenal:       tv("Arsenal", "London", "red", "white", "navy", "#EF0107", "#063672", "Soccer", "Premier League"),
  "Man City":    tv("Manchester City", "Manchester", "sky blue", "white", "navy", "#6CABDD", "#1C2C5B", "Soccer", "Premier League"),
  Liverpool:     tv("Liverpool", "Liverpool", "red", "white", "green", "#C8102E", "#00B2A9", "Soccer", "Premier League"),
  Chelsea:       tv("Chelsea", "London", "royal blue", "white", "gold", "#034694", "#DBA111", "Soccer", "Premier League"),
  "Man United":  tv("Man United", "Manchester", "red", "white", "black", "#DA291C", "#FBE122", "Soccer", "Premier League"),
  Tottenham:     tv("Tottenham", "London", "navy", "white", "blue", "#132257", "#FFFFFF", "Soccer", "Premier League"),
  Newcastle:     tv("Newcastle", "Newcastle", "black", "white", "blue", "#241F20", "#FFFFFF", "Soccer", "Premier League"),
  "Aston Villa": tv("Aston Villa", "Birmingham", "claret", "sky blue", "white", "#670E36", "#95BFE5", "Soccer", "Premier League"),
  Brighton:      tv("Brighton", "Brighton", "blue", "white", "gold", "#0057B8", "#FFCD00", "Soccer", "Premier League"),
  "West Ham":    tv("West Ham", "London", "claret", "sky blue", "white", "#7A263A", "#1BB1E7", "Soccer", "Premier League"),

  // --- Liga MX ---
  "Club America": tv("Club America", "Mexico City", "yellow", "navy", "white", "#FFD200", "#12214B", "Soccer", "Liga MX"),
  Guadalajara:   tv("Guadalajara", "Guadalajara", "red", "white", "navy", "#CE1126", "#002855", "Soccer", "Liga MX"),
  "Cruz Azul":   tv("Cruz Azul", "Mexico City", "blue", "white", "red", "#0047AB", "#FFFFFF", "Soccer", "Liga MX"),
  "UNAM Pumas":  tv("UNAM Pumas", "Mexico City", "navy", "gold", "white", "#00205C", "#CBA052", "Soccer", "Liga MX"),
  Monterrey:     tv("Monterrey", "Monterrey", "navy", "white", "blue", "#0A2240", "#FFFFFF", "Soccer", "Liga MX"),
  Tigres:        tv("Tigres", "Monterrey", "yellow", "navy", "white", "#FFCB05", "#003366", "Soccer", "Liga MX"),

  // --- MLS ---
  "Inter Miami": tv("Inter Miami", "Fort Lauderdale", "pink", "black", "white", "#F7B5CD", "#231F20", "Soccer", "MLS"),
  LAFC:          tv("LAFC", "Los Angeles", "black", "gold", "white", "#C39E6D", "#000000", "Soccer", "MLS"),
  "Atlanta United": tv("Atlanta United", "Atlanta", "red", "black", "gold", "#80000B", "#231F20", "Soccer", "MLS"),
  Cincinnati:    tv("FC Cincinnati", "Cincinnati", "orange", "blue", "white", "#F05323", "#003087", "Soccer", "MLS"),
  "Columbus Crew": tv("Columbus Crew", "Columbus", "black", "gold", "white", "#000000", "#FEDD00", "Soccer", "MLS"),
};

/**
 * Given a pick's matchup string and pickText, determine which team is
 * relevant (the picked team, or first team for totals) and return visuals.
 */
export function resolveWinningTeamVisuals(
  matchup: string,
  pickText: string,
  sport: string,
): TeamVisualData | null {
  const parsed = parsePick(pickText);

  // For team bets (spread, moneyline), use the picked team
  let teamHint = parsed.team;

  // For totals (over/under) or if no team found, use first team in matchup
  if (!teamHint) {
    const parts = matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i);
    teamHint = parts[0]?.trim() || null;
  }

  if (!teamHint) return null;

  const hintLower = teamHint.toLowerCase();

  // 1. Exact key match with sport filter
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    if (key.toLowerCase() === hintLower && data.sport.toLowerCase() === sport.toLowerCase()) {
      return data;
    }
  }

  // 2. Exact key match without sport filter
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    if (key.toLowerCase() === hintLower) return data;
  }

  // 3. Substring match with sport filter
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    const keyLower = key.toLowerCase();
    if (
      (hintLower.includes(keyLower) || keyLower.includes(hintLower)) &&
      data.sport.toLowerCase() === sport.toLowerCase()
    ) {
      return data;
    }
  }

  // 4. Substring match without sport filter (for Soccer where sport might be league name)
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    const keyLower = key.toLowerCase();
    if (hintLower.includes(keyLower) || keyLower.includes(hintLower)) {
      return data;
    }
  }

  return null;
}
