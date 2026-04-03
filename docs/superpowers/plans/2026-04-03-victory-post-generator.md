# Victory Post Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate Instagram-ready victory graphics (team-themed background + ticket + branding) and captions when the auto-settler marks a pick as WIN, saved as drafts for Oscar to review.

**Architecture:** When settle-picks detects a win, fire-and-forget calls a pipeline that: (1) resolves team colors, (2) generates a background via gpt-image-1, (3) renders a ticket image via sharp compositing, (4) composites everything into a 1080x1350 PNG, (5) generates a caption via Claude, (6) uploads to R2, (7) saves a draft record, (8) sends a Telegram preview. All wrapped in try-catch so it never blocks settlement.

**Tech Stack:** Next.js 16 + TypeScript, OpenAI SDK (gpt-image-1), Anthropic SDK (claude-sonnet-4-20250514), sharp (image compositing), Drizzle ORM + SQLite, Cloudflare R2, Telegram Bot API.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/data/team-visuals.ts` | Team-to-color/city lookup for all major sports |
| Create | `src/lib/victory-prompts.ts` | Sport-specific gpt-image-1 prompt templates with variable substitution |
| Create | `src/lib/victory-image-generator.ts` | gpt-image-1 API call, returns PNG Buffer |
| Create | `src/lib/victory-ticket-renderer.ts` | Server-side ticket rendering using sharp |
| Create | `src/lib/victory-compositor.ts` | Composite background + ticket + gradient + branding into final 1080x1350 |
| Create | `src/lib/victory-caption-generator.ts` | Claude API call for Instagram caption |
| Create | `src/lib/victory-post-pipeline.ts` | Orchestrator that chains all steps, fire-and-forget |
| Create | `src/db/schema/victory-posts.ts` | Drizzle schema for victory_posts table |
| Modify | `src/db/schema/index.ts` | Export new victoryPosts schema |
| Modify | `src/app/api/cron/settle-picks/route.ts:168` | Hook victory post pipeline after win celebration |

---

### Task 1: Install sharp

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp**

```bash
npm install sharp @types/sharp
```

- [ ] **Step 2: Verify installation**

Run: `node -e "const sharp = require('sharp'); console.log('sharp version:', sharp.versions?.sharp || 'ok')"`
Expected: Prints sharp version without error.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: install sharp for server-side image compositing

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 2: Team Visual Data Lookup

**Files:**
- Create: `src/data/team-visuals.ts`

- [ ] **Step 1: Create the team visuals type and data file**

Create `src/data/team-visuals.ts` with the `TeamVisualData` type, the full `TEAM_VISUALS` record (all NBA 30, MLB 30, NFL 32, NHL 32 teams + key soccer teams), and the `resolveWinningTeamVisuals()` function.

```typescript
import { parsePick } from "@/lib/team-normalizer";

export type TeamVisualData = {
  teamName: string;
  city: string;
  primaryColor: string;      // Descriptive for image prompts
  secondaryColor: string;
  accentColor: string;
  primaryHex: string;         // For compositing
  secondaryHex: string;
  sport: "NBA" | "MLB" | "NFL" | "NHL" | "Soccer" | "NCAAF" | "NCAAB";
  league?: string;
};

// Key: substring that appears in pickText or matchup (case-insensitive matching)
export const TEAM_VISUALS: Record<string, TeamVisualData> = {
  // ── NBA (30 teams) ────────────────────────────────────────
  "Hawks": { teamName: "Atlanta Hawks", city: "Atlanta", primaryColor: "red", secondaryColor: "black", accentColor: "gold", primaryHex: "#E03A3E", secondaryHex: "#000000", sport: "NBA" },
  "Celtics": { teamName: "Boston Celtics", city: "Boston", primaryColor: "kelly green", secondaryColor: "white", accentColor: "gold", primaryHex: "#007A33", secondaryHex: "#FFFFFF", sport: "NBA" },
  "Nets": { teamName: "Brooklyn Nets", city: "Brooklyn", primaryColor: "black", secondaryColor: "white", accentColor: "grey", primaryHex: "#000000", secondaryHex: "#FFFFFF", sport: "NBA" },
  "Hornets": { teamName: "Charlotte Hornets", city: "Charlotte", primaryColor: "teal", secondaryColor: "purple", accentColor: "white", primaryHex: "#1D1160", secondaryHex: "#00788C", sport: "NBA" },
  "Bulls": { teamName: "Chicago Bulls", city: "Chicago", primaryColor: "red", secondaryColor: "black", accentColor: "white", primaryHex: "#CE1141", secondaryHex: "#000000", sport: "NBA" },
  "Cavaliers": { teamName: "Cleveland Cavaliers", city: "Cleveland", primaryColor: "wine", secondaryColor: "gold", accentColor: "navy", primaryHex: "#860038", secondaryHex: "#FDBB30", sport: "NBA" },
  "Mavericks": { teamName: "Dallas Mavericks", city: "Dallas", primaryColor: "royal blue", secondaryColor: "navy", accentColor: "silver", primaryHex: "#00538C", secondaryHex: "#002B5E", sport: "NBA" },
  "Nuggets": { teamName: "Denver Nuggets", city: "Denver", primaryColor: "midnight blue", secondaryColor: "gold", accentColor: "red", primaryHex: "#0E2240", secondaryHex: "#FEC524", sport: "NBA" },
  "Pistons": { teamName: "Detroit Pistons", city: "Detroit", primaryColor: "red", secondaryColor: "royal blue", accentColor: "white", primaryHex: "#C8102E", secondaryHex: "#1D42BA", sport: "NBA" },
  "Warriors": { teamName: "Golden State Warriors", city: "San Francisco", primaryColor: "royal blue", secondaryColor: "gold", accentColor: "white", primaryHex: "#1D428A", secondaryHex: "#FFC72C", sport: "NBA" },
  "Rockets": { teamName: "Houston Rockets", city: "Houston", primaryColor: "red", secondaryColor: "black", accentColor: "silver", primaryHex: "#CE1141", secondaryHex: "#000000", sport: "NBA" },
  "Pacers": { teamName: "Indiana Pacers", city: "Indianapolis", primaryColor: "navy", secondaryColor: "gold", accentColor: "white", primaryHex: "#002D62", secondaryHex: "#FDBB30", sport: "NBA" },
  "Clippers": { teamName: "LA Clippers", city: "Los Angeles", primaryColor: "red", secondaryColor: "blue", accentColor: "white", primaryHex: "#C8102E", secondaryHex: "#1D428A", sport: "NBA" },
  "Lakers": { teamName: "Los Angeles Lakers", city: "Los Angeles", primaryColor: "purple and gold", secondaryColor: "gold", accentColor: "white", primaryHex: "#552583", secondaryHex: "#FDB927", sport: "NBA" },
  "Grizzlies": { teamName: "Memphis Grizzlies", city: "Memphis", primaryColor: "midnight blue", secondaryColor: "light blue", accentColor: "gold", primaryHex: "#5D76A9", secondaryHex: "#12173F", sport: "NBA" },
  "Heat": { teamName: "Miami Heat", city: "Miami", primaryColor: "red", secondaryColor: "black", accentColor: "yellow", primaryHex: "#98002E", secondaryHex: "#000000", sport: "NBA" },
  "Bucks": { teamName: "Milwaukee Bucks", city: "Milwaukee", primaryColor: "hunter green", secondaryColor: "cream", accentColor: "blue", primaryHex: "#00471B", secondaryHex: "#EEE1C6", sport: "NBA" },
  "Timberwolves": { teamName: "Minnesota Timberwolves", city: "Minneapolis", primaryColor: "midnight blue", secondaryColor: "green", accentColor: "grey", primaryHex: "#0C2340", secondaryHex: "#236192", sport: "NBA" },
  "Pelicans": { teamName: "New Orleans Pelicans", city: "New Orleans", primaryColor: "navy", secondaryColor: "red", accentColor: "gold", primaryHex: "#0C2340", secondaryHex: "#C8102E", sport: "NBA" },
  "Knicks": { teamName: "New York Knicks", city: "New York", primaryColor: "orange", secondaryColor: "blue", accentColor: "silver", primaryHex: "#006BB6", secondaryHex: "#F58426", sport: "NBA" },
  "Thunder": { teamName: "Oklahoma City Thunder", city: "Oklahoma City", primaryColor: "blue", secondaryColor: "orange", accentColor: "yellow", primaryHex: "#007AC1", secondaryHex: "#EF6100", sport: "NBA" },
  "Magic": { teamName: "Orlando Magic", city: "Orlando", primaryColor: "blue", secondaryColor: "black", accentColor: "white", primaryHex: "#0077C0", secondaryHex: "#000000", sport: "NBA" },
  "76ers": { teamName: "Philadelphia 76ers", city: "Philadelphia", primaryColor: "blue", secondaryColor: "red", accentColor: "white", primaryHex: "#006BB6", secondaryHex: "#ED174C", sport: "NBA" },
  "Suns": { teamName: "Phoenix Suns", city: "Phoenix", primaryColor: "purple", secondaryColor: "orange", accentColor: "black", primaryHex: "#1D1160", secondaryHex: "#E56020", sport: "NBA" },
  "Trail Blazers": { teamName: "Portland Trail Blazers", city: "Portland", primaryColor: "red", secondaryColor: "black", accentColor: "white", primaryHex: "#E03A3E", secondaryHex: "#000000", sport: "NBA" },
  "Kings": { teamName: "Sacramento Kings", city: "Sacramento", primaryColor: "purple", secondaryColor: "silver", accentColor: "black", primaryHex: "#5A2D81", secondaryHex: "#63727A", sport: "NBA" },
  "Spurs": { teamName: "San Antonio Spurs", city: "San Antonio", primaryColor: "silver", secondaryColor: "black", accentColor: "white", primaryHex: "#C4CED4", secondaryHex: "#000000", sport: "NBA" },
  "Raptors": { teamName: "Toronto Raptors", city: "Toronto", primaryColor: "red", secondaryColor: "black", accentColor: "silver", primaryHex: "#CE1141", secondaryHex: "#000000", sport: "NBA" },
  "Jazz": { teamName: "Utah Jazz", city: "Salt Lake City", primaryColor: "navy", secondaryColor: "yellow", accentColor: "green", primaryHex: "#002B5C", secondaryHex: "#F9A01B", sport: "NBA" },
  "Wizards": { teamName: "Washington Wizards", city: "Washington D.C.", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#002B5C", secondaryHex: "#E31837", sport: "NBA" },

  // ── MLB (30 teams) ────────────────────────────────────────
  "Diamondbacks": { teamName: "Arizona Diamondbacks", city: "Phoenix", primaryColor: "red", secondaryColor: "teal", accentColor: "black", primaryHex: "#A71930", secondaryHex: "#E3D4AD", sport: "MLB" },
  "Braves": { teamName: "Atlanta Braves", city: "Atlanta", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#CE1141", secondaryHex: "#13274F", sport: "MLB" },
  "Orioles": { teamName: "Baltimore Orioles", city: "Baltimore", primaryColor: "orange", secondaryColor: "black", accentColor: "white", primaryHex: "#DF4601", secondaryHex: "#000000", sport: "MLB" },
  "Red Sox": { teamName: "Boston Red Sox", city: "Boston", primaryColor: "red", secondaryColor: "navy", accentColor: "white", primaryHex: "#BD3039", secondaryHex: "#0C2340", sport: "MLB" },
  "Cubs": { teamName: "Chicago Cubs", city: "Chicago", primaryColor: "blue", secondaryColor: "red", accentColor: "white", primaryHex: "#0E3386", secondaryHex: "#CC3433", sport: "MLB" },
  "White Sox": { teamName: "Chicago White Sox", city: "Chicago", primaryColor: "black", secondaryColor: "silver", accentColor: "white", primaryHex: "#000000", secondaryHex: "#C4CED4", sport: "MLB" },
  "Reds": { teamName: "Cincinnati Reds", city: "Cincinnati", primaryColor: "red", secondaryColor: "white", accentColor: "black", primaryHex: "#C6011F", secondaryHex: "#FFFFFF", sport: "MLB" },
  "Guardians": { teamName: "Cleveland Guardians", city: "Cleveland", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#00385D", secondaryHex: "#E50022", sport: "MLB" },
  "Rockies": { teamName: "Colorado Rockies", city: "Denver", primaryColor: "purple", secondaryColor: "black", accentColor: "silver", primaryHex: "#33006F", secondaryHex: "#000000", sport: "MLB" },
  "Tigers": { teamName: "Detroit Tigers", city: "Detroit", primaryColor: "navy", secondaryColor: "orange", accentColor: "white", primaryHex: "#0C2340", secondaryHex: "#FA4616", sport: "MLB" },
  "Astros": { teamName: "Houston Astros", city: "Houston", primaryColor: "navy", secondaryColor: "orange", accentColor: "white", primaryHex: "#002D62", secondaryHex: "#EB6E1F", sport: "MLB" },
  "Royals": { teamName: "Kansas City Royals", city: "Kansas City", primaryColor: "royal blue", secondaryColor: "gold", accentColor: "white", primaryHex: "#004687", secondaryHex: "#BD9B60", sport: "MLB" },
  "Angels": { teamName: "Los Angeles Angels", city: "Anaheim", primaryColor: "red", secondaryColor: "silver", accentColor: "white", primaryHex: "#BA0021", secondaryHex: "#C4CED4", sport: "MLB" },
  "Dodgers": { teamName: "Los Angeles Dodgers", city: "Los Angeles", primaryColor: "dodger blue", secondaryColor: "white", accentColor: "red", primaryHex: "#005A9C", secondaryHex: "#FFFFFF", sport: "MLB" },
  "Marlins": { teamName: "Miami Marlins", city: "Miami", primaryColor: "black", secondaryColor: "red", accentColor: "blue", primaryHex: "#000000", secondaryHex: "#ED6F21", sport: "MLB" },
  "Brewers": { teamName: "Milwaukee Brewers", city: "Milwaukee", primaryColor: "navy", secondaryColor: "gold", accentColor: "white", primaryHex: "#12284B", secondaryHex: "#FFC52F", sport: "MLB" },
  "Twins": { teamName: "Minnesota Twins", city: "Minneapolis", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#002B5C", secondaryHex: "#D31145", sport: "MLB" },
  "Mets": { teamName: "New York Mets", city: "New York", primaryColor: "blue", secondaryColor: "orange", accentColor: "white", primaryHex: "#002D72", secondaryHex: "#FF5910", sport: "MLB" },
  "Yankees": { teamName: "New York Yankees", city: "New York", primaryColor: "navy", secondaryColor: "white", accentColor: "grey", primaryHex: "#003087", secondaryHex: "#FFFFFF", sport: "MLB" },
  "Athletics": { teamName: "Oakland Athletics", city: "Oakland", primaryColor: "green", secondaryColor: "gold", accentColor: "white", primaryHex: "#003831", secondaryHex: "#EFB21E", sport: "MLB" },
  "Phillies": { teamName: "Philadelphia Phillies", city: "Philadelphia", primaryColor: "red", secondaryColor: "blue", accentColor: "white", primaryHex: "#E81828", secondaryHex: "#002D72", sport: "MLB" },
  "Pirates": { teamName: "Pittsburgh Pirates", city: "Pittsburgh", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FDB827", sport: "MLB" },
  "Padres": { teamName: "San Diego Padres", city: "San Diego", primaryColor: "brown", secondaryColor: "gold", accentColor: "white", primaryHex: "#2F241D", secondaryHex: "#FFC425", sport: "MLB" },
  "Giants": { teamName: "San Francisco Giants", city: "San Francisco", primaryColor: "orange", secondaryColor: "black", accentColor: "cream", primaryHex: "#FD5A1E", secondaryHex: "#000000", sport: "MLB" },
  "Mariners": { teamName: "Seattle Mariners", city: "Seattle", primaryColor: "navy", secondaryColor: "teal", accentColor: "silver", primaryHex: "#0C2C56", secondaryHex: "#005C5C", sport: "MLB" },
  "Cardinals": { teamName: "St. Louis Cardinals", city: "St. Louis", primaryColor: "red", secondaryColor: "navy", accentColor: "white", primaryHex: "#C41E3A", secondaryHex: "#0C2340", sport: "MLB" },
  "Rays": { teamName: "Tampa Bay Rays", city: "Tampa Bay", primaryColor: "navy", secondaryColor: "light blue", accentColor: "yellow", primaryHex: "#092C5C", secondaryHex: "#8FBCE6", sport: "MLB" },
  "Rangers": { teamName: "Texas Rangers", city: "Arlington", primaryColor: "blue", secondaryColor: "red", accentColor: "white", primaryHex: "#003278", secondaryHex: "#C0111F", sport: "MLB" },
  "Blue Jays": { teamName: "Toronto Blue Jays", city: "Toronto", primaryColor: "royal blue", secondaryColor: "navy", accentColor: "red", primaryHex: "#134A8E", secondaryHex: "#1D2D5C", sport: "MLB" },
  "Nationals": { teamName: "Washington Nationals", city: "Washington D.C.", primaryColor: "red", secondaryColor: "navy", accentColor: "white", primaryHex: "#AB0003", secondaryHex: "#14225A", sport: "MLB" },

  // ── NFL (32 teams) ────────────────────────────────────────
  "Cardinals": { teamName: "Arizona Cardinals", city: "Phoenix", primaryColor: "cardinal red", secondaryColor: "white", accentColor: "black", primaryHex: "#97233F", secondaryHex: "#000000", sport: "NFL" },
  "Falcons": { teamName: "Atlanta Falcons", city: "Atlanta", primaryColor: "red", secondaryColor: "black", accentColor: "silver", primaryHex: "#A71930", secondaryHex: "#000000", sport: "NFL" },
  "Ravens": { teamName: "Baltimore Ravens", city: "Baltimore", primaryColor: "purple", secondaryColor: "gold", accentColor: "black", primaryHex: "#241773", secondaryHex: "#9E7C0C", sport: "NFL" },
  "Bills": { teamName: "Buffalo Bills", city: "Buffalo", primaryColor: "royal blue", secondaryColor: "red", accentColor: "white", primaryHex: "#00338D", secondaryHex: "#C60C30", sport: "NFL" },
  "Panthers": { teamName: "Carolina Panthers", city: "Charlotte", primaryColor: "black", secondaryColor: "blue", accentColor: "silver", primaryHex: "#0085CA", secondaryHex: "#000000", sport: "NFL" },
  "Bears": { teamName: "Chicago Bears", city: "Chicago", primaryColor: "navy", secondaryColor: "orange", accentColor: "white", primaryHex: "#0B162A", secondaryHex: "#C83803", sport: "NFL" },
  "Bengals": { teamName: "Cincinnati Bengals", city: "Cincinnati", primaryColor: "orange", secondaryColor: "black", accentColor: "white", primaryHex: "#FB4F14", secondaryHex: "#000000", sport: "NFL" },
  "Browns": { teamName: "Cleveland Browns", city: "Cleveland", primaryColor: "brown", secondaryColor: "orange", accentColor: "white", primaryHex: "#311D00", secondaryHex: "#FF3C00", sport: "NFL" },
  "Cowboys": { teamName: "Dallas Cowboys", city: "Dallas", primaryColor: "silver", secondaryColor: "navy", accentColor: "white", primaryHex: "#003594", secondaryHex: "#869397", sport: "NFL" },
  "Broncos": { teamName: "Denver Broncos", city: "Denver", primaryColor: "orange", secondaryColor: "navy", accentColor: "white", primaryHex: "#FB4F14", secondaryHex: "#002244", sport: "NFL" },
  "Lions": { teamName: "Detroit Lions", city: "Detroit", primaryColor: "honolulu blue", secondaryColor: "silver", accentColor: "white", primaryHex: "#0076B6", secondaryHex: "#B0B7BC", sport: "NFL" },
  "Packers": { teamName: "Green Bay Packers", city: "Green Bay", primaryColor: "green", secondaryColor: "gold", accentColor: "white", primaryHex: "#203731", secondaryHex: "#FFB612", sport: "NFL" },
  "Texans": { teamName: "Houston Texans", city: "Houston", primaryColor: "deep blue", secondaryColor: "red", accentColor: "white", primaryHex: "#03202F", secondaryHex: "#A71930", sport: "NFL" },
  "Colts": { teamName: "Indianapolis Colts", city: "Indianapolis", primaryColor: "royal blue", secondaryColor: "white", accentColor: "grey", primaryHex: "#002C5F", secondaryHex: "#FFFFFF", sport: "NFL" },
  "Jaguars": { teamName: "Jacksonville Jaguars", city: "Jacksonville", primaryColor: "teal", secondaryColor: "gold", accentColor: "black", primaryHex: "#006778", secondaryHex: "#D7A22A", sport: "NFL" },
  "Chiefs": { teamName: "Kansas City Chiefs", city: "Kansas City", primaryColor: "red", secondaryColor: "gold", accentColor: "white", primaryHex: "#E31837", secondaryHex: "#FFB81C", sport: "NFL" },
  "Raiders": { teamName: "Las Vegas Raiders", city: "Las Vegas", primaryColor: "silver", secondaryColor: "black", accentColor: "white", primaryHex: "#000000", secondaryHex: "#A5ACAF", sport: "NFL" },
  "Chargers": { teamName: "Los Angeles Chargers", city: "Los Angeles", primaryColor: "powder blue", secondaryColor: "gold", accentColor: "white", primaryHex: "#0080C6", secondaryHex: "#FFC20E", sport: "NFL" },
  "Rams": { teamName: "Los Angeles Rams", city: "Los Angeles", primaryColor: "royal blue", secondaryColor: "gold", accentColor: "white", primaryHex: "#003594", secondaryHex: "#FFA300", sport: "NFL" },
  "Dolphins": { teamName: "Miami Dolphins", city: "Miami", primaryColor: "aqua", secondaryColor: "orange", accentColor: "white", primaryHex: "#008E97", secondaryHex: "#FC4C02", sport: "NFL" },
  "Vikings": { teamName: "Minnesota Vikings", city: "Minneapolis", primaryColor: "purple", secondaryColor: "gold", accentColor: "white", primaryHex: "#4F2683", secondaryHex: "#FFC62F", sport: "NFL" },
  "Patriots": { teamName: "New England Patriots", city: "Boston", primaryColor: "navy", secondaryColor: "red", accentColor: "silver", primaryHex: "#002244", secondaryHex: "#C60C30", sport: "NFL" },
  "Saints": { teamName: "New Orleans Saints", city: "New Orleans", primaryColor: "gold", secondaryColor: "black", accentColor: "white", primaryHex: "#D3BC8D", secondaryHex: "#000000", sport: "NFL" },
  "Giants": { teamName: "New York Giants", city: "New York", primaryColor: "blue", secondaryColor: "red", accentColor: "white", primaryHex: "#0B2265", secondaryHex: "#A71930", sport: "NFL" },
  "Jets": { teamName: "New York Jets", city: "New York", primaryColor: "green", secondaryColor: "white", accentColor: "black", primaryHex: "#125740", secondaryHex: "#FFFFFF", sport: "NFL" },
  "Eagles": { teamName: "Philadelphia Eagles", city: "Philadelphia", primaryColor: "midnight green", secondaryColor: "silver", accentColor: "black", primaryHex: "#004C54", secondaryHex: "#A5ACAF", sport: "NFL" },
  "Steelers": { teamName: "Pittsburgh Steelers", city: "Pittsburgh", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FFB612", sport: "NFL" },
  "49ers": { teamName: "San Francisco 49ers", city: "San Francisco", primaryColor: "red", secondaryColor: "gold", accentColor: "white", primaryHex: "#AA0000", secondaryHex: "#B3995D", sport: "NFL" },
  "Seahawks": { teamName: "Seattle Seahawks", city: "Seattle", primaryColor: "navy", secondaryColor: "action green", accentColor: "grey", primaryHex: "#002244", secondaryHex: "#69BE28", sport: "NFL" },
  "Buccaneers": { teamName: "Tampa Bay Buccaneers", city: "Tampa Bay", primaryColor: "red", secondaryColor: "pewter", accentColor: "black", primaryHex: "#D50A0A", secondaryHex: "#B1BABF", sport: "NFL" },
  "Titans": { teamName: "Tennessee Titans", city: "Nashville", primaryColor: "navy", secondaryColor: "red", accentColor: "light blue", primaryHex: "#0C2340", secondaryHex: "#4B92DB", sport: "NFL" },
  "Commanders": { teamName: "Washington Commanders", city: "Washington D.C.", primaryColor: "burgundy", secondaryColor: "gold", accentColor: "white", primaryHex: "#5A1414", secondaryHex: "#FFB612", sport: "NFL" },

  // ── NHL (32 teams) ────────────────────────────────────────
  "Ducks": { teamName: "Anaheim Ducks", city: "Anaheim", primaryColor: "orange", secondaryColor: "black", accentColor: "gold", primaryHex: "#F47A38", secondaryHex: "#000000", sport: "NHL" },
  "Bruins": { teamName: "Boston Bruins", city: "Boston", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FFB81C", sport: "NHL" },
  "Sabres": { teamName: "Buffalo Sabres", city: "Buffalo", primaryColor: "navy", secondaryColor: "gold", accentColor: "white", primaryHex: "#002654", secondaryHex: "#FCB514", sport: "NHL" },
  "Flames": { teamName: "Calgary Flames", city: "Calgary", primaryColor: "red", secondaryColor: "gold", accentColor: "white", primaryHex: "#D2001C", secondaryHex: "#FAAF19", sport: "NHL" },
  "Hurricanes": { teamName: "Carolina Hurricanes", city: "Raleigh", primaryColor: "red", secondaryColor: "black", accentColor: "white", primaryHex: "#CC0000", secondaryHex: "#000000", sport: "NHL" },
  "Blackhawks": { teamName: "Chicago Blackhawks", city: "Chicago", primaryColor: "red", secondaryColor: "black", accentColor: "white", primaryHex: "#CF0A2C", secondaryHex: "#000000", sport: "NHL" },
  "Avalanche": { teamName: "Colorado Avalanche", city: "Denver", primaryColor: "burgundy", secondaryColor: "blue", accentColor: "silver", primaryHex: "#6F263D", secondaryHex: "#236192", sport: "NHL" },
  "Blue Jackets": { teamName: "Columbus Blue Jackets", city: "Columbus", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#002654", secondaryHex: "#CE1126", sport: "NHL" },
  "Stars": { teamName: "Dallas Stars", city: "Dallas", primaryColor: "victory green", secondaryColor: "black", accentColor: "silver", primaryHex: "#006847", secondaryHex: "#000000", sport: "NHL" },
  "Red Wings": { teamName: "Detroit Red Wings", city: "Detroit", primaryColor: "red", secondaryColor: "white", accentColor: "black", primaryHex: "#CE1126", secondaryHex: "#FFFFFF", sport: "NHL" },
  "Oilers": { teamName: "Edmonton Oilers", city: "Edmonton", primaryColor: "royal blue", secondaryColor: "orange", accentColor: "white", primaryHex: "#041E42", secondaryHex: "#FF4C00", sport: "NHL" },
  "Panthers": { teamName: "Florida Panthers", city: "Sunrise", primaryColor: "red", secondaryColor: "navy", accentColor: "gold", primaryHex: "#041E42", secondaryHex: "#C8102E", sport: "NHL" },
  "Kings": { teamName: "Los Angeles Kings", city: "Los Angeles", primaryColor: "silver", secondaryColor: "black", accentColor: "white", primaryHex: "#000000", secondaryHex: "#A2AAAD", sport: "NHL" },
  "Wild": { teamName: "Minnesota Wild", city: "St. Paul", primaryColor: "forest green", secondaryColor: "red", accentColor: "gold", primaryHex: "#154734", secondaryHex: "#A6192E", sport: "NHL" },
  "Canadiens": { teamName: "Montreal Canadiens", city: "Montreal", primaryColor: "red", secondaryColor: "blue", accentColor: "white", primaryHex: "#AF1E2D", secondaryHex: "#192168", sport: "NHL" },
  "Predators": { teamName: "Nashville Predators", city: "Nashville", primaryColor: "gold", secondaryColor: "navy", accentColor: "white", primaryHex: "#FFB81C", secondaryHex: "#041E42", sport: "NHL" },
  "Devils": { teamName: "New Jersey Devils", city: "Newark", primaryColor: "red", secondaryColor: "black", accentColor: "white", primaryHex: "#CE1126", secondaryHex: "#000000", sport: "NHL" },
  "Islanders": { teamName: "New York Islanders", city: "New York", primaryColor: "blue", secondaryColor: "orange", accentColor: "white", primaryHex: "#00539B", secondaryHex: "#F47D30", sport: "NHL" },
  "Rangers": { teamName: "New York Rangers", city: "New York", primaryColor: "blue", secondaryColor: "red", accentColor: "white", primaryHex: "#0038A8", secondaryHex: "#CE1126", sport: "NHL" },
  "Senators": { teamName: "Ottawa Senators", city: "Ottawa", primaryColor: "red", secondaryColor: "black", accentColor: "gold", primaryHex: "#C52032", secondaryHex: "#000000", sport: "NHL" },
  "Flyers": { teamName: "Philadelphia Flyers", city: "Philadelphia", primaryColor: "orange", secondaryColor: "black", accentColor: "white", primaryHex: "#F74902", secondaryHex: "#000000", sport: "NHL" },
  "Penguins": { teamName: "Pittsburgh Penguins", city: "Pittsburgh", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FCB514", sport: "NHL" },
  "Sharks": { teamName: "San Jose Sharks", city: "San Jose", primaryColor: "teal", secondaryColor: "black", accentColor: "white", primaryHex: "#006D75", secondaryHex: "#000000", sport: "NHL" },
  "Kraken": { teamName: "Seattle Kraken", city: "Seattle", primaryColor: "deep sea blue", secondaryColor: "ice blue", accentColor: "red", primaryHex: "#001628", secondaryHex: "#99D9D9", sport: "NHL" },
  "Blues": { teamName: "St. Louis Blues", city: "St. Louis", primaryColor: "blue", secondaryColor: "gold", accentColor: "white", primaryHex: "#002F87", secondaryHex: "#FCB514", sport: "NHL" },
  "Lightning": { teamName: "Tampa Bay Lightning", city: "Tampa Bay", primaryColor: "blue", secondaryColor: "white", accentColor: "black", primaryHex: "#002868", secondaryHex: "#FFFFFF", sport: "NHL" },
  "Maple Leafs": { teamName: "Toronto Maple Leafs", city: "Toronto", primaryColor: "blue", secondaryColor: "white", accentColor: "grey", primaryHex: "#00205B", secondaryHex: "#FFFFFF", sport: "NHL" },
  "Utah Hockey Club": { teamName: "Utah Hockey Club", city: "Salt Lake City", primaryColor: "black", secondaryColor: "blue", accentColor: "white", primaryHex: "#000000", secondaryHex: "#69B3E7", sport: "NHL" },
  "Canucks": { teamName: "Vancouver Canucks", city: "Vancouver", primaryColor: "blue", secondaryColor: "green", accentColor: "white", primaryHex: "#00205B", secondaryHex: "#00843D", sport: "NHL" },
  "Golden Knights": { teamName: "Vegas Golden Knights", city: "Las Vegas", primaryColor: "gold", secondaryColor: "black", accentColor: "red", primaryHex: "#B4975A", secondaryHex: "#333F42", sport: "NHL" },
  "Capitals": { teamName: "Washington Capitals", city: "Washington D.C.", primaryColor: "red", secondaryColor: "navy", accentColor: "white", primaryHex: "#C8102E", secondaryHex: "#041E42", sport: "NHL" },
  "Jets": { teamName: "Winnipeg Jets", city: "Winnipeg", primaryColor: "navy", secondaryColor: "red", accentColor: "white", primaryHex: "#041E42", secondaryHex: "#AC162C", sport: "NHL" },

  // ── Soccer (key teams) ────────────────────────────────────
  "Real Madrid": { teamName: "Real Madrid", city: "Madrid", primaryColor: "royal white", secondaryColor: "gold", accentColor: "navy blue", primaryHex: "#FFFFFF", secondaryHex: "#FEBE10", sport: "Soccer", league: "La Liga" },
  "Barcelona": { teamName: "FC Barcelona", city: "Barcelona", primaryColor: "deep blue and garnet", secondaryColor: "garnet red", accentColor: "gold", primaryHex: "#004D98", secondaryHex: "#A50044", sport: "Soccer", league: "La Liga" },
  "Atletico Madrid": { teamName: "Atletico Madrid", city: "Madrid", primaryColor: "red and white stripes", secondaryColor: "navy", accentColor: "white", primaryHex: "#CB3524", secondaryHex: "#272E61", sport: "Soccer", league: "La Liga" },
  "Athletic Club": { teamName: "Athletic Club", city: "Bilbao", primaryColor: "red and white", secondaryColor: "red", accentColor: "black", primaryHex: "#EE2523", secondaryHex: "#FFFFFF", sport: "Soccer", league: "La Liga" },
  "Villarreal": { teamName: "Villarreal CF", city: "Villarreal", primaryColor: "yellow", secondaryColor: "navy", accentColor: "white", primaryHex: "#FFE114", secondaryHex: "#005187", sport: "Soccer", league: "La Liga" },

  "Arsenal": { teamName: "Arsenal", city: "London", primaryColor: "red", secondaryColor: "white", accentColor: "navy", primaryHex: "#EF0107", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Man City": { teamName: "Manchester City", city: "Manchester", primaryColor: "sky blue", secondaryColor: "white", accentColor: "navy", primaryHex: "#6CABDD", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Liverpool": { teamName: "Liverpool", city: "Liverpool", primaryColor: "red", secondaryColor: "white", accentColor: "green", primaryHex: "#C8102E", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Chelsea": { teamName: "Chelsea", city: "London", primaryColor: "royal blue", secondaryColor: "white", accentColor: "gold", primaryHex: "#034694", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Man United": { teamName: "Manchester United", city: "Manchester", primaryColor: "red", secondaryColor: "white", accentColor: "black", primaryHex: "#DA291C", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Tottenham": { teamName: "Tottenham Hotspur", city: "London", primaryColor: "white", secondaryColor: "navy", accentColor: "gold", primaryHex: "#FFFFFF", secondaryHex: "#132257", sport: "Soccer", league: "Premier League" },
  "Newcastle": { teamName: "Newcastle United", city: "Newcastle", primaryColor: "black and white", secondaryColor: "black", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "Aston Villa": { teamName: "Aston Villa", city: "Birmingham", primaryColor: "claret", secondaryColor: "sky blue", accentColor: "white", primaryHex: "#670E36", secondaryHex: "#95BFE5", sport: "Soccer", league: "Premier League" },
  "Brighton": { teamName: "Brighton & Hove Albion", city: "Brighton", primaryColor: "blue", secondaryColor: "white", accentColor: "gold", primaryHex: "#0057B8", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Premier League" },
  "West Ham": { teamName: "West Ham United", city: "London", primaryColor: "claret", secondaryColor: "blue", accentColor: "white", primaryHex: "#7A263A", secondaryHex: "#1BB1E7", sport: "Soccer", league: "Premier League" },

  "Club America": { teamName: "Club America", city: "Mexico City", primaryColor: "yellow", secondaryColor: "navy", accentColor: "white", primaryHex: "#FFD200", secondaryHex: "#002B5C", sport: "Soccer", league: "Liga MX" },
  "Guadalajara": { teamName: "C.D. Guadalajara", city: "Guadalajara", primaryColor: "red and white stripes", secondaryColor: "blue", accentColor: "white", primaryHex: "#CD1735", secondaryHex: "#1A3B73", sport: "Soccer", league: "Liga MX" },
  "Cruz Azul": { teamName: "Cruz Azul", city: "Mexico City", primaryColor: "blue", secondaryColor: "white", accentColor: "red", primaryHex: "#0047AB", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Liga MX" },
  "UNAM Pumas": { teamName: "UNAM Pumas", city: "Mexico City", primaryColor: "gold", secondaryColor: "navy", accentColor: "white", primaryHex: "#FFD200", secondaryHex: "#003366", sport: "Soccer", league: "Liga MX" },
  "Monterrey": { teamName: "CF Monterrey", city: "Monterrey", primaryColor: "navy", secondaryColor: "white", accentColor: "blue", primaryHex: "#002B5C", secondaryHex: "#FFFFFF", sport: "Soccer", league: "Liga MX" },
  "Tigres": { teamName: "Tigres UANL", city: "Monterrey", primaryColor: "yellow", secondaryColor: "blue", accentColor: "white", primaryHex: "#FFC300", secondaryHex: "#1A237E", sport: "Soccer", league: "Liga MX" },

  "Inter Miami": { teamName: "Inter Miami CF", city: "Miami", primaryColor: "black and pink", secondaryColor: "soft pink", accentColor: "white", primaryHex: "#231F20", secondaryHex: "#F7B5CD", sport: "Soccer", league: "MLS" },
  "LAFC": { teamName: "Los Angeles FC", city: "Los Angeles", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#C39E6D", sport: "Soccer", league: "MLS" },
  "Atlanta United": { teamName: "Atlanta United FC", city: "Atlanta", primaryColor: "red", secondaryColor: "black", accentColor: "gold", primaryHex: "#80000B", secondaryHex: "#000000", sport: "Soccer", league: "MLS" },
  "Cincinnati": { teamName: "FC Cincinnati", city: "Cincinnati", primaryColor: "blue", secondaryColor: "orange", accentColor: "white", primaryHex: "#003087", secondaryHex: "#FE5000", sport: "Soccer", league: "MLS" },
  "Columbus Crew": { teamName: "Columbus Crew", city: "Columbus", primaryColor: "black", secondaryColor: "gold", accentColor: "white", primaryHex: "#000000", secondaryHex: "#FEDD00", sport: "Soccer", league: "MLS" },
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

  // Try exact key match first
  const hintLower = teamHint.toLowerCase();
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    if (key.toLowerCase() === hintLower) return data;
  }

  // Try substring match — check if any key appears in the hint or vice versa
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    const keyLower = key.toLowerCase();
    if (hintLower.includes(keyLower) || keyLower.includes(hintLower)) {
      // Verify sport matches (avoid cross-sport collisions like Cardinals, Rangers, etc.)
      if (data.sport.toLowerCase() === sport.toLowerCase()) return data;
    }
  }

  // Relaxed match without sport filter (for Soccer where sport might be league name)
  for (const [key, data] of Object.entries(TEAM_VISUALS)) {
    const keyLower = key.toLowerCase();
    if (hintLower.includes(keyLower) || keyLower.includes(hintLower)) {
      return data;
    }
  }

  return null;
}
```

Note: Several team names collide across sports (Cardinals, Rangers, Panthers, Giants, Jets, Kings). The sport-aware matching in `resolveWinningTeamVisuals` handles this by checking the sport parameter first. The last entry in the Record for a duplicate key wins at the JS level, but the function iterates `Object.entries()` and filters by sport, so all sports are covered.

**IMPORTANT:** Since JS Records can't have duplicate keys, teams with the same key across sports need sport-prefixed keys. Use these prefixed keys for collisions:

- `"Cardinals"` → keep as MLB (last wins). Add `"ARI Cardinals"` for NFL.
- `"Rangers"` → keep as NHL. Add `"TEX Rangers"` for MLB.
- `"Giants"` → keep as MLB. Add `"NY Giants"` for NFL.
- `"Panthers"` → keep as NHL. Add `"CAR Panthers"` for NFL.
- `"Jets"` → keep as NHL. Add `"NY Jets"` for NFL.
- `"Kings"` → keep as NHL. Add `"SAC Kings"` for NBA.

The `resolveWinningTeamVisuals()` function's sport-aware iteration handles the rest. Add the prefixed duplicate entries alongside the originals.

- [ ] **Step 2: Commit**

```bash
git add src/data/team-visuals.ts
git commit -m "$(cat <<'EOF'
feat: add team visual data lookup for victory post backgrounds

Maps 150+ teams across NBA, MLB, NFL, NHL, and Soccer to official
brand colors (descriptive + hex) for dynamic image prompt generation.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 3: Victory Background Prompts

**Files:**
- Create: `src/lib/victory-prompts.ts`

- [ ] **Step 1: Create the prompt template system**

```typescript
import type { TeamVisualData } from "@/data/team-visuals";

type SportPromptVariation = {
  id: string;
  sport: string;
  template: string;
};

// Prompt templates with {variables} for team data injection.
// Oscar will refine these prompts over time. Each uses:
//   {team_name}, {city}, {primary_color}, {secondary_color}, {accent_color}
export const VICTORY_BACKGROUND_PROMPTS: SportPromptVariation[] = [
  // ── NBA ────────────────────────────────────────────────────
  {
    id: "nba-v1",
    sport: "NBA",
    template: `An abstract, high-energy celebration background for a winning basketball bet. The composition features bold geometric shapes, dynamic diagonal lines, and a radiating burst pattern in {primary_color} and {secondary_color}. The mood is victorious and electric. No text, no logos, no people, no basketballs. Abstract art only. Aspect ratio 4:5, portrait orientation. 1080x1350 pixels.`,
  },
  {
    id: "nba-v2",
    sport: "NBA",
    template: `A sleek, premium sports victory graphic background. Sweeping curves and light streaks in {primary_color} fading to {secondary_color}, with subtle {accent_color} highlights. Feels like a luxury brand ad meets sports energy. No text, no logos, no people, no balls. Abstract textures only. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "nba-v3",
    sport: "NBA",
    template: `An intense, atmospheric background with dramatic spotlights piercing through smoke in {primary_color} and {secondary_color} tones. Arena-like ambiance without showing an actual arena. Abstract beams of light. No text, no logos, no people. Portrait 4:5, 1080x1350.`,
  },

  // ── MLB ────────────────────────────────────────────────────
  {
    id: "mlb-v1",
    sport: "MLB",
    template: `An abstract victory celebration background for baseball. Dynamic paint splashes and brushstrokes in {primary_color} and {secondary_color} with {accent_color} accents. Bold, confident energy. No text, no logos, no people, no baseballs. Abstract art only. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "mlb-v2",
    sport: "MLB",
    template: `A premium, dark atmospheric background with dramatic {primary_color} and {secondary_color} gradients. Subtle lens flare and bokeh effects. Stadium lights mood without showing a stadium. No text, no logos, no people. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "mlb-v3",
    sport: "MLB",
    template: `Bold abstract waves and flowing shapes in {primary_color} merging with {secondary_color} on a dark background. Metallic {accent_color} highlights give a premium feel. No text, no logos, no people, no sports equipment. Portrait 4:5, 1080x1350.`,
  },

  // ── NFL ────────────────────────────────────────────────────
  {
    id: "nfl-v1",
    sport: "NFL",
    template: `A powerful, abstract victory background with sharp angular geometric shapes in {primary_color} and {secondary_color}. Aggressive, hard-hitting energy with {accent_color} edge highlights. No text, no logos, no people, no footballs. Abstract only. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "nfl-v2",
    sport: "NFL",
    template: `An explosive abstract background with shattered glass or impact effects in {primary_color} and {secondary_color}. Dark atmosphere with dramatic lighting. Power and intensity. No text, no logos, no people. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "nfl-v3",
    sport: "NFL",
    template: `Dramatic storm clouds and lightning bolts rendered in {primary_color} and {secondary_color} tones with {accent_color} electrical effects. Raw power atmosphere. No text, no logos, no people, no sports equipment. Abstract only. Portrait 4:5, 1080x1350.`,
  },

  // ── NHL ────────────────────────────────────────────────────
  {
    id: "nhl-v1",
    sport: "NHL",
    template: `An icy, dramatic abstract background with crystalline patterns and frost textures in {primary_color} and {secondary_color}. Cold, sharp energy with {accent_color} glow effects. No text, no logos, no people, no hockey equipment. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "nhl-v2",
    sport: "NHL",
    template: `Abstract ice shatter pattern with dramatic lighting. Deep {primary_color} and bright {secondary_color} fragments exploding outward. Premium cold-weather victory feel. No text, no logos, no people. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "nhl-v3",
    sport: "NHL",
    template: `Northern lights inspired abstract background in {primary_color} and {secondary_color} with ethereal {accent_color} shimmer. Flowing, premium atmosphere. No text, no logos, no people, no sports equipment. Portrait 4:5, 1080x1350.`,
  },

  // ── Soccer ────────────────────────────────────────────────
  {
    id: "soccer-v1",
    sport: "Soccer",
    template: `A vibrant, passionate celebration background. Abstract paint strokes and color explosions in {primary_color} and {secondary_color} on dark canvas. Fútbol passion energy. No text, no logos, no people, no balls. Abstract art. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "soccer-v2",
    sport: "Soccer",
    template: `Premium abstract background with flowing silk-like ribbons in {primary_color} and {secondary_color} against a dark gradient. Elegant, European football atmosphere. {accent_color} sparkle accents. No text, no logos, no people. Portrait 4:5, 1080x1350.`,
  },
  {
    id: "soccer-v3",
    sport: "Soccer",
    template: `Abstract geometric mosaic pattern in {primary_color} and {secondary_color} with {accent_color} gold leaf accents. Inspired by stadium architecture and passion. No text, no logos, no people, no sports equipment. Portrait 4:5, 1080x1350.`,
  },
];

// Generic fallback for unmatched sports (NCAAF, NCAAB, etc.)
const GENERIC_PROMPT = `A dynamic, abstract celebration background with bold geometric patterns and light effects in {primary_color} and {secondary_color}. Premium sports energy. No text, no logos, no people. Portrait 4:5, 1080x1350.`;

/**
 * Select a random prompt variation for a sport and fill in team data.
 */
export function buildBackgroundPrompt(
  sport: string,
  team: TeamVisualData,
): string {
  const sportUpper = sport.toUpperCase();
  const sportPrompts = VICTORY_BACKGROUND_PROMPTS.filter(
    (p) => p.sport.toUpperCase() === sportUpper,
  );

  const template =
    sportPrompts.length > 0
      ? sportPrompts[Math.floor(Math.random() * sportPrompts.length)].template
      : GENERIC_PROMPT;

  return template
    .replace(/\{team_name\}/g, team.teamName)
    .replace(/\{city\}/g, team.city)
    .replace(/\{primary_color\}/g, team.primaryColor)
    .replace(/\{secondary_color\}/g, team.secondaryColor)
    .replace(/\{accent_color\}/g, team.accentColor);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-prompts.ts
git commit -m "$(cat <<'EOF'
feat: add victory background prompt templates for gpt-image-1

3 variations per sport (NBA, MLB, NFL, NHL, Soccer) plus generic fallback.
Templates use team color variables for dynamic prompt generation.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 4: Victory Image Generator (gpt-image-1)

**Files:**
- Create: `src/lib/victory-image-generator.ts`

- [ ] **Step 1: Create the image generation service**

Reuses the existing OpenAI singleton pattern from `src/lib/ai-image.ts`.

```typescript
import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate a victory background image using gpt-image-1.
 * Returns the image as a PNG Buffer.
 * Size: 1024x1536 (portrait, closest to 4:5 Instagram ratio).
 */
export async function generateVictoryBackground(
  prompt: string,
): Promise<Buffer> {
  const openai = getOpenAI();

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1536",
    quality: "high",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("No image data returned from gpt-image-1");
  }

  return Buffer.from(imageData.b64_json, "base64");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-image-generator.ts
git commit -m "$(cat <<'EOF'
feat: add gpt-image-1 victory background generator

Generates 1024x1536 portrait backgrounds using team-themed prompts.
Follows existing OpenAI singleton pattern from ai-image.ts.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 5: Server-Side Ticket Renderer

**Files:**
- Create: `src/lib/victory-ticket-renderer.ts`

- [ ] **Step 1: Create the server-side ticket renderer using sharp**

This creates a simplified ticket image (green card with bet info) using sharp's SVG overlay. It doesn't need to replicate every detail of the client-side ticket — just the key info visible in the final composite.

```typescript
import sharp from "sharp";

type TicketRenderInput = {
  sport: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  matchup: string;
  team1Score?: number;
  team2Score?: number;
};

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function calculatePayout(wager: number, odds: number): number {
  if (odds > 0) {
    return wager + wager * (odds / 100);
  }
  return wager + wager * (100 / Math.abs(odds));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a sportsbook-style ticket as a PNG buffer using sharp + SVG.
 * Simplified version of the client-side ticket for composite overlay.
 *
 * Output: 700x500 PNG with transparent corners (rounded rect).
 */
export async function renderTicketServer(
  input: TicketRenderInput,
): Promise<Buffer> {
  const width = 700;
  const height = 500;
  const wager = (input.units ?? 1) * 100;
  const payout = input.odds ? calculatePayout(wager, input.odds) : wager;
  const oddsText = input.odds ? formatOdds(input.odds) : "—";
  const wagerText = `$${wager.toLocaleString("en-US")}`;
  const payoutText = `$${payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Parse matchup for score display
  const matchupParts = input.matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i);
  const team1 = matchupParts[0]?.trim() || "";
  const team2 = matchupParts[1]?.trim() || "";
  const hasScores =
    input.team1Score !== undefined && input.team2Score !== undefined;

  const scoreSection = hasScores
    ? `
    <rect x="40" y="310" width="620" height="50" rx="8" fill="rgba(0,0,0,0.2)"/>
    <text x="120" y="343" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="end">${escapeXml(team1)}</text>
    <text x="180" y="343" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="bold" fill="white" text-anchor="middle">${input.team1Score}</text>
    <text x="350" y="343" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">FINAL</text>
    <text x="520" y="343" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="bold" fill="white" text-anchor="middle">${input.team2Score}</text>
    <text x="580" y="343" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="start">${escapeXml(team2)}</text>
    `
    : "";

  const wagerY = hasScores ? 410 : 370;

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05D17A"/>
      <stop offset="100%" stop-color="#04B568"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" rx="15" fill="url(#bg)"/>

  <!-- Header bar -->
  <rect x="0" y="0" width="${width}" height="80" rx="15" fill="rgba(0,0,0,0.15)"/>
  <rect x="0" y="40" width="${width}" height="40" fill="rgba(0,0,0,0.15)"/>

  <!-- Sport badge -->
  <text x="40" y="55" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="bold" fill="rgba(255,255,255,0.9)" text-transform="uppercase">${escapeXml(input.sport)}</text>

  <!-- WIN badge -->
  <rect x="560" y="20" width="100" height="40" rx="20" fill="rgba(255,255,255,0.25)"/>
  <text x="610" y="47" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">WIN ✓</text>

  <!-- Pick text (main) -->
  <text x="350" y="145" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(input.pickText)}</text>

  <!-- Odds -->
  <text x="350" y="190" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle">${oddsText}</text>

  <!-- Matchup -->
  <text x="350" y="240" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapeXml(input.matchup)}</text>

  <!-- Divider -->
  <line x1="60" y1="270" x2="640" y2="270" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>

  <!-- Score section (if available) -->
  ${scoreSection}

  <!-- Wager / Payout -->
  <text x="120" y="${wagerY}" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">WAGER</text>
  <text x="120" y="${wagerY + 30}" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="bold" fill="white">${wagerText}</text>

  <text x="580" y="${wagerY}" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="rgba(255,255,255,0.6)" text-anchor="end">PAYOUT</text>
  <text x="580" y="${wagerY + 30}" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="end">${payoutText}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-ticket-renderer.ts
git commit -m "$(cat <<'EOF'
feat: add server-side ticket renderer using sharp SVG overlay

Renders sportsbook-style ticket as 700x500 PNG with pick text, odds,
matchup, scores, and wager/payout. Used for victory post compositing.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 6: Compositing Pipeline

**Files:**
- Create: `src/lib/victory-compositor.ts`

- [ ] **Step 1: Create the compositor that assembles the final image**

```typescript
import sharp from "sharp";
import type { TeamVisualData } from "@/data/team-visuals";

const LABEL_VARIATIONS = {
  vip: [
    "VIP PICK HIT",
    "LA EXCLUSIVA",
    "VIP WINNER",
    "EXCLUSIVE VIP PLAY",
    "PICK VIP COBRADO",
  ],
  free: [
    "FREE {SPORT} PICKS",
    "PICKS DE {SPORT}",
    "FREE PICK WINNER",
    "PICK GRATIS COBRADO",
    "FREE {SPORT} WIN",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Composite a victory post image (1080x1350, Instagram 4:5 portrait):
 * 1. Background (AI-generated, resized to fill)
 * 2. Bottom gradient overlay (ensures text readability)
 * 3. Ticket image (centered, upper portion)
 * 4. Sport/tier label text (bottom area)
 * 5. WinFact branding (very bottom)
 */
export async function compositeVictoryPost(params: {
  backgroundImage: Buffer;
  ticketImage: Buffer;
  sport: string;
  tier: "free" | "vip";
  teamVisuals: TeamVisualData;
  labelText?: string;
}): Promise<Buffer> {
  const W = 1080;
  const H = 1350;

  // 1. Resize background to fill canvas
  const background = await sharp(params.backgroundImage)
    .resize(W, H, { fit: "cover" })
    .toBuffer();

  // 2. Resize ticket to ~65% width, maintain aspect ratio
  const ticketWidth = Math.round(W * 0.65);
  const ticket = await sharp(params.ticketImage)
    .resize(ticketWidth, null, { fit: "inside" })
    .png()
    .toBuffer();
  const ticketMeta = await sharp(ticket).metadata();
  const ticketH = ticketMeta.height || 350;
  const ticketX = Math.round((W - ticketWidth) / 2);
  const ticketY = Math.round(H * 0.08); // 8% from top

  // 3. Build label text
  const labelPool = LABEL_VARIATIONS[params.tier];
  const rawLabel =
    params.labelText || pickRandom(labelPool);
  const label = escapeXml(
    rawLabel.replace(/\{SPORT\}/g, params.sport.toUpperCase()),
  );

  // 4. Create bottom overlay SVG (gradient + text + branding)
  const overlaySvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="40%" stop-color="rgba(0,0,0,0)" />
      <stop offset="75%" stop-color="rgba(0,0,0,0.6)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.7)"/>
    </filter>
  </defs>

  <!-- Bottom gradient -->
  <rect width="${W}" height="${H}" fill="url(#bottomFade)"/>

  <!-- Label text -->
  <text x="${W / 2}" y="${H - 130}"
    font-family="Arial,Helvetica,sans-serif"
    font-size="48" font-weight="bold" fill="white"
    text-anchor="middle" filter="url(#shadow)">${label}</text>

  <!-- WinFact branding -->
  <text x="${W / 2}" y="${H - 60}"
    font-family="Arial,Helvetica,sans-serif"
    font-size="24" fill="rgba(255,255,255,0.85)"
    text-anchor="middle" letter-spacing="2">WINFACTPICKS.COM</text>
</svg>`;

  // 5. Composite everything
  const result = await sharp(background)
    .composite([
      // Gradient + text overlay
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
      // Ticket image
      {
        input: ticket,
        top: ticketY,
        left: ticketX,
      },
    ])
    .png({ quality: 90 })
    .toBuffer();

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-compositor.ts
git commit -m "$(cat <<'EOF'
feat: add victory post compositor using sharp

Assembles 1080x1350 Instagram-ready image from AI background,
ticket overlay, gradient, label text, and WinFact branding.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 7: Caption Generator

**Files:**
- Create: `src/lib/victory-caption-generator.ts`

- [ ] **Step 1: Create the caption generator**

```typescript
import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

/**
 * Generate an Instagram caption for a victory post.
 * Bilingual — randomly English or Spanish.
 */
export async function generateVictoryCaption(pick: {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  tier: "free" | "vip";
}): Promise<string> {
  const language = Math.random() < 0.5 ? "english" : "spanish";
  const oddsStr = pick.odds
    ? pick.odds > 0
      ? `+${pick.odds}`
      : `${pick.odds}`
    : "N/A";

  const prompt = `Generate an Instagram caption for a winning sports pick post by WinFact Picks (@winfact_picks), a data-driven sports betting picks service.

Pick details:
- Sport: ${pick.sport}
- Matchup: ${pick.matchup}
- Pick: ${pick.pickText}
- Odds: ${oddsStr}
- Tier: ${pick.tier === "vip" ? "VIP (exclusive paid pick)" : "Free (given to everyone)"}
- Result: WIN

Language: ${language}
${language === "spanish" ? "Write in casual Latin American Spanish — Miami vibe, confident, celebratory." : "Write in casual American English — confident, not arrogant, celebratory."}

RULES:
- 2-4 sentences MAX. Short and punchy.
- Celebratory but not over the top. Confident, not cocky.
- Reference the data/model if natural ("the model called it", "data doesn't miss", "los datos no fallan")
- If VIP tier: mention that this was an exclusive VIP play, hint at the value of joining
- If Free tier: mention it was a free pick — "we gave this one away for free"
- Include a brief CTA — "Link in bio" or "winfactpicks.com" naturally
- End with 8-12 relevant hashtags on a new line
- Hashtags should include: #WinFactPicks #SportsBetting #${pick.sport} + relevant team/league tags
- DO NOT use quotation marks around the caption
- Output ONLY the caption text + hashtags. No preamble.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";

  return text.replace(/^["']|["']$/g, "").trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-caption-generator.ts
git commit -m "$(cat <<'EOF'
feat: add victory post caption generator via Claude API

Generates bilingual (EN/ES) Instagram captions with hashtags.
Tier-aware messaging for VIP vs free picks.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 8: Victory Posts Database Schema

**Files:**
- Create: `src/db/schema/victory-posts.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: Create the victory posts schema**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const victoryPosts = sqliteTable("victory_posts", {
  id: text("id").primaryKey(),
  pickId: text("pick_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull(),
  sport: text("sport").notNull(),
  tier: text("tier").notNull(), // "free" | "vip"
  status: text("status").notNull().default("draft"), // "draft" | "posted" | "skipped"
  postedAt: text("posted_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
```

- [ ] **Step 2: Add export to schema index**

In `src/db/schema/index.ts`, add at the end:

```typescript
export { victoryPosts } from "./victory-posts";
```

- [ ] **Step 3: Generate migration**

Run: `npm run db:generate`

- [ ] **Step 4: Push migration**

Run: `npm run db:push`

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/victory-posts.ts src/db/schema/index.ts drizzle/
git commit -m "$(cat <<'EOF'
feat: add victory_posts table for draft victory post storage

Tracks generated victory posts with pick reference, image URL,
caption, sport, tier, and draft/posted/skipped status.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 9: Victory Post Pipeline Orchestrator

**Files:**
- Create: `src/lib/victory-post-pipeline.ts`

- [ ] **Step 1: Create the orchestrator**

```typescript
import { db } from "@/db";
import { victoryPosts, media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { resolveWinningTeamVisuals } from "@/data/team-visuals";
import { buildBackgroundPrompt } from "./victory-prompts";
import { generateVictoryBackground } from "./victory-image-generator";
import { renderTicketServer } from "./victory-ticket-renderer";
import { compositeVictoryPost } from "./victory-compositor";
import { generateVictoryCaption } from "./victory-caption-generator";
import { uploadToR2, isR2Configured } from "./r2";
import { sendAdminNotification } from "./telegram";
import { getSiteContent } from "@/db/queries/site-content";

/**
 * Full victory post generation pipeline.
 * Called by the auto-settler when a pick is settled as a WIN.
 * Fire-and-forget — errors are logged but never block settlement.
 */
export async function generateVictoryPost(pick: {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  tier: "free" | "vip";
  team1Score?: number;
  team2Score?: number;
}): Promise<void> {
  try {
    // Check feature toggle
    const enabled = await getSiteContent("victory_posts_enabled");
    if (enabled !== "true") {
      console.log("[victory-post] Feature disabled, skipping");
      return;
    }

    // Check for duplicates
    const existing = await db
      .select({ id: victoryPosts.id })
      .from(victoryPosts)
      .where(eq(victoryPosts.pickId, pick.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[victory-post] Already exists for pick ${pick.id}, skipping`);
      return;
    }

    console.log(`[victory-post] Starting generation for pick ${pick.id}`);

    // 1. Resolve team visuals
    const teamVisuals = resolveWinningTeamVisuals(
      pick.matchup,
      pick.pickText,
      pick.sport,
    );

    if (!teamVisuals) {
      console.warn(
        `[victory-post] No team visual data for: ${pick.pickText} (${pick.sport})`,
      );
      return;
    }

    // 2. Build background prompt
    const backgroundPrompt = buildBackgroundPrompt(pick.sport, teamVisuals);

    // 3. Generate background image
    console.log(`[victory-post] Generating background for ${teamVisuals.teamName}`);
    const backgroundBuffer = await generateVictoryBackground(backgroundPrompt);

    // 4. Render ticket image
    console.log("[victory-post] Rendering ticket");
    const ticketBuffer = await renderTicketServer({
      sport: pick.sport,
      pickText: pick.pickText,
      odds: pick.odds,
      units: pick.units,
      matchup: pick.matchup,
      team1Score: pick.team1Score,
      team2Score: pick.team2Score,
    });

    // 5. Composite final image
    console.log("[victory-post] Compositing final image");
    const finalImage = await compositeVictoryPost({
      backgroundImage: backgroundBuffer,
      ticketImage: ticketBuffer,
      sport: pick.sport,
      tier: pick.tier as "free" | "vip",
      teamVisuals,
    });

    // 6. Generate caption
    console.log("[victory-post] Generating caption");
    const caption = await generateVictoryCaption({
      sport: pick.sport,
      matchup: pick.matchup,
      pickText: pick.pickText,
      odds: pick.odds,
      tier: pick.tier as "free" | "vip",
    });

    // 7. Upload to R2
    let imageUrl: string;
    const filename = `victory-${pick.id}-${Date.now()}.png`;

    if (isR2Configured()) {
      const key = `uploads/${filename}`;
      imageUrl = await uploadToR2(key, finalImage, "image/png");
      console.log(`[victory-post] Uploaded to R2: ${imageUrl}`);
    } else {
      // Dev fallback
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), finalImage);
      imageUrl = `/uploads/${filename}`;
      console.log(`[victory-post] Saved locally: ${imageUrl}`);
    }

    // 8. Save to media library
    const mediaId = randomUUID();
    await db.insert(media).values({
      id: mediaId,
      filename,
      url: imageUrl,
      mimeType: "image/png",
      width: 1080,
      height: 1350,
      altText: `Victory post: ${pick.matchup} — ${pick.pickText}`,
    });

    // 9. Save victory post draft
    const postId = randomUUID();
    await db.insert(victoryPosts).values({
      id: postId,
      pickId: pick.id,
      imageUrl,
      caption,
      sport: pick.sport,
      tier: pick.tier,
      status: "draft",
    });

    // 10. Send admin Telegram preview
    const previewMsg =
      `📸 *Victory Post Ready*\n\n` +
      `Pick: ${pick.matchup} — ${pick.pickText} ✅\n` +
      `Sport: ${pick.sport} | Tier: ${pick.tier}\n\n` +
      `Caption:\n${caption}\n\n` +
      `Image: ${imageUrl}`;

    await sendAdminNotification(previewMsg);

    console.log(`[victory-post] Complete for pick ${pick.id}`);
  } catch (error) {
    console.error(`[victory-post] Failed for pick ${pick.id}:`, error);
    try {
      await sendAdminNotification(
        `⚠️ Victory post generation failed\n\nPick: ${pick.matchup}\nError: ${error instanceof Error ? error.message : String(error)}`,
      );
    } catch {
      // Don't compound the failure
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/victory-post-pipeline.ts
git commit -m "$(cat <<'EOF'
feat: add victory post pipeline orchestrator

Chains team resolution → background generation → ticket rendering →
compositing → caption generation → R2 upload → DB save → Telegram preview.
Fire-and-forget with feature toggle and duplicate detection.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 10: Hook Into Auto-Settler

**Files:**
- Modify: `src/app/api/cron/settle-picks/route.ts:1-2` (imports)
- Modify: `src/app/api/cron/settle-picks/route.ts:168-182` (after win celebration)

- [ ] **Step 1: Add import at the top of the file**

After the existing imports (line 12), add:

```typescript
import { generateVictoryPost } from "@/lib/victory-post-pipeline";
```

- [ ] **Step 2: Add victory post generation after win celebration**

After the `postToBuffer(message)` call (line 181), before the closing `}` of the `if (settlement.result === "win")` block, add:

```typescript
            // Generate victory post (fire-and-forget — heavy async, don't await)
            generateVictoryPost({
              id: pick.id,
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
              odds: pick.odds,
              units: pick.units,
              tier: pick.tier as "free" | "vip",
              team1Score: game.awayScore,
              team2Score: game.homeScore,
            }).catch((err) =>
              console.error("[settle-picks] Victory post generation failed:", err)
            );
```

Note: `game.awayScore` / `game.homeScore` come from the matched ESPN game (`ESPNGame` type), which is already in scope at this point in the code (see line 120-130 where `game` is used).

- [ ] **Step 3: Verify the auto-settler still compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors from the modified file.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/settle-picks/route.ts
git commit -m "$(cat <<'EOF'
feat: hook victory post pipeline into auto-settler on win

Fire-and-forget call after win celebration. Passes ESPN scores
through to the pipeline. Never blocks pick settlement.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

### Task 11: Admin Feature Toggle

**Files:**
- No new files — uses existing `siteContent` system

- [ ] **Step 1: Seed the toggle as disabled**

The pipeline already checks `getSiteContent("victory_posts_enabled")` in Task 9. Oscar enables it via the existing admin content panel at `/admin/content`.

To verify it defaults to disabled (no row = null ≠ "true"), no seeding needed — the check `if (enabled !== "true")` already handles the null case.

- [ ] **Step 2: Verify the full pipeline compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: complete victory post generator — auto-generate Instagram graphics on win

Full pipeline: team color resolution → gpt-image-1 background → server-side
ticket rendering → sharp compositing → Claude caption → R2 upload → Telegram preview.

Disabled by default — enable via victory_posts_enabled in site content.

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

---

## Post-Implementation Notes

### Vercel Timeout Consideration

The full pipeline (gpt-image-1 + sharp compositing + Claude caption) may take 15-30 seconds. Since it's fire-and-forget from the settler, it runs as its own execution. On Vercel Pro (60s timeout), this should be fine. On Hobby (10s), the background image generation alone may timeout. If needed, extract `generateVictoryPost` into a separate API route (`/api/admin/generate-victory-post`) and call it via fetch from the settler.

### Future Enhancements (Not in scope)

- Admin `/admin/victory-posts` page for reviewing/downloading drafts
- Telegram photo message (sendPhoto) instead of just text preview
- Sweep detection (3+ wins in a day → special label)
- WinFact logo overlay (load from `public/images/` and composite with sharp)
