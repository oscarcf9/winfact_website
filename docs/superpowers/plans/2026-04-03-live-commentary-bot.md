# Live Commentary Bot ("Hyper Animador") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically post live, natural-sounding bilingual game commentary to the WinFact Telegram group during active games, plus celebrate wins when the auto-settler marks picks as won.

**Architecture:** Vercel Cron (every 15 min) -> new API route that fetches live scores from ESPN public API, picks one interesting game, generates a short commentary via Claude Sonnet, and posts it to Telegram via the existing bot. Win celebrations are integrated into the existing settle-picks cron. An admin toggle in `siteContent` controls the feature.

**Tech Stack:** Next.js 15, Drizzle ORM (SQLite/Turso), Anthropic SDK (already installed), ESPN public API (no auth), existing Telegram bot infrastructure.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/db/schema/commentary-log.ts` | Drizzle schema for commentary tracking table |
| Modify | `src/db/schema/index.ts` | Re-export new table |
| Modify | `src/db/index.ts` | Auto-migrate new table |
| Create | `src/lib/espn-live.ts` | Fetch live games from ESPN, filter by target teams, determine "interesting" games |
| Create | `src/lib/commentary-generator.ts` | Generate bilingual commentary via Claude API |
| Create | `src/app/api/cron/live-commentary/route.ts` | Cron route: orchestrate fetch -> filter -> generate -> post -> log |
| Modify | `src/lib/telegram-templates.ts` | Add `win_celebration` template category |
| Modify | `src/lib/telegram.ts` | Add `sendWinCelebration()` function |
| Modify | `src/app/api/cron/settle-picks/route.ts` | Post win celebration after auto-settling a winning pick |
| Modify | `vercel.json` | Add live-commentary cron schedule |

---

### Task 1: Commentary Log Schema

**Files:**
- Create: `src/db/schema/commentary-log.ts`
- Modify: `src/db/schema/index.ts:27` (add export)
- Modify: `src/db/index.ts:17` (add auto-migrate)

- [ ] **Step 1: Create the schema file**

Create `src/db/schema/commentary-log.ts`:

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const commentaryLog = sqliteTable("commentary_log", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  sport: text("sport").notNull(),
  message: text("message").notNull(),
  postedAt: integer("posted_at").notNull(),
  gameState: text("game_state"),
}, (table) => ([
  index("idx_commentary_game_posted").on(table.gameId, table.postedAt),
]));
```

- [ ] **Step 2: Export from schema index**

Add to `src/db/schema/index.ts` after the last export line (line 27):

```typescript
export { commentaryLog } from "./commentary-log";
```

- [ ] **Step 3: Add auto-migration in db/index.ts**

Add after the existing `_migratedAudit` block (after line 29) in `src/db/index.ts`:

```typescript
const _migratedCommentaryLog = client.execute(`
  CREATE TABLE IF NOT EXISTS commentary_log (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    message TEXT NOT NULL,
    posted_at INTEGER NOT NULL,
    game_state TEXT
  )
`).catch(() => {/* table already exists */});

const _migratedCommentaryIdx = client.execute(
  `CREATE INDEX IF NOT EXISTS idx_commentary_game_posted ON commentary_log(game_id, posted_at)`
).catch(() => {});
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/commentary-log.ts src/db/schema/index.ts src/db/index.ts
git commit -m "feat: add commentary_log schema for live game commentary tracking"
```

---

### Task 2: ESPN Live Scores Fetcher

**Files:**
- Create: `src/lib/espn-live.ts`

This module reuses the same ESPN public API as the existing `src/lib/espn.ts` but fetches from the `/scoreboard` endpoint without a date param (returns today's games) and filters for **in-progress** games only. It uses its own endpoint map because it targets a different set of leagues (includes soccer leagues not in the settler).

- [ ] **Step 1: Create the ESPN live fetcher**

Create `src/lib/espn-live.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/espn-live.ts
git commit -m "feat: add ESPN live scores fetcher for commentary bot"
```

---

### Task 3: Commentary Generator

**Files:**
- Create: `src/lib/commentary-generator.ts`

Uses the same Anthropic SDK singleton pattern as `src/lib/ai-assistant.ts`.

- [ ] **Step 1: Create the commentary generator**

Create `src/lib/commentary-generator.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function generateCommentary(game: {
  sport: string;
  league: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number;
  clock: string;
  situation: string;
}): Promise<string> {
  // ~60% Spanish, ~40% English — matches bilingual group dynamics
  const language = Math.random() < 0.6 ? "spanish" : "english";

  const sportContext = getSportContext(game.sport, game.period);

  const prompt = `You are a passionate sports fan live-commenting in a Telegram group. Generate ONE short comment (max 250 characters) about this LIVE game.

Sport: ${game.sport} (${game.league})
Teams: ${game.team1} vs ${game.team2}
Score: ${game.score1} - ${game.score2}
Period: ${sportContext}
Clock: ${game.clock}
Game situation: ${game.situation}

Language: ${language}
${language === "spanish" ? "Use casual Latin American Spanish. Miami/Caribbean vibe." : "Use casual American English. Like texting your boys about the game."}

STRICT RULES:
- Maximum 250 characters
- Casual and natural — like you're watching the game RIGHT NOW
- Use 1-2 relevant emojis
- Be HONEST about what you see — if it's a blowout, say it. If it's close, show excitement.
- DO NOT be neutral or diplomatic — have a take
- DO NOT use hashtags
- DO NOT mention betting, picks, odds, or predictions
- DO NOT say "right now" or "currently" or "at the moment"
- DO NOT use quotation marks
- DO NOT add any preamble — output ONLY the comment text

TONE EXAMPLES (${language}):
${language === "spanish" ? `
"Napoli dominando todo el segundo tiempo y no hicieron nada"
"Lakers perdiendo por 15 en el tercero, se les acabo"
"Arsenal 2-2 Chelsea, esto esta que arde"
"Home run de Soto con bases llenas"
"Ya van 6 goles en este partido, que locura"
"Se puso bueno esto, empate en el ultimo cuarto"
` : `
"Lakers down 15 in the 3rd, wrap it up"
"This Arsenal-Chelsea game is INSANE"
"Soto just cleared the bases with a grand slam"
"6 goals already in this one, absolute chaos"
"Tied up going into the 4th, this is what we watch for"
"First quarter was a shootout, 65 points already"
`}

Generate ONLY the comment. Nothing else.`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    // Safety: strip wrapping quotes and any hashtags
    let comment = text
      .replace(/^["']|["']$/g, "")
      .replace(/#\w+/g, "")
      .trim();

    if (comment.length > 280) {
      comment = comment.substring(0, 277) + "...";
    }

    return comment;
  } catch (error) {
    console.error("[commentary] Claude API error:", error);
    return "";
  }
}

function getSportContext(sport: string, period: number): string {
  switch (sport) {
    case "NBA":
    case "NFL":
      return `${ordinal(period)} quarter`;
    case "MLB":
      return `${ordinal(period)} inning`;
    case "NHL":
      return `${ordinal(period)} period`;
    default:
      return period === 1 ? "1st half" : "2nd half";
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/commentary-generator.ts
git commit -m "feat: add Claude-powered commentary generator for live games"
```

---

### Task 4: Live Commentary Cron Route

**Files:**
- Create: `src/app/api/cron/live-commentary/route.ts`

Follows the same auth pattern as `src/app/api/cron/settle-picks/route.ts`.

- [ ] **Step 1: Create the cron route**

Create `src/app/api/cron/live-commentary/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { fetchAllLiveGames } from "@/lib/espn-live";
import { generateCommentary } from "@/lib/commentary-generator";
import { sendTelegramMessage } from "@/lib/telegram";
import { getSiteContent } from "@/db/queries/site-content";

const COOLDOWN_MINUTES = 45;

function isGameTime(): boolean {
  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    })
  );

  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return etHour >= 10 && etHour <= 23;
  }

  // Weekdays: noon to midnight ET
  return etHour >= 12 && etHour <= 23;
}

async function hasRecentComment(gameId: string): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - COOLDOWN_MINUTES * 60;

  const recent = await db
    .select()
    .from(commentaryLog)
    .where(and(eq(commentaryLog.gameId, gameId), gte(commentaryLog.postedAt, cutoff)))
    .limit(1);

  return recent.length > 0;
}

export async function GET(req: Request) {
  // Auth — same pattern as settle-picks
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin toggle
  const enabled = await getSiteContent("live_commentary_enabled");
  if (enabled !== "true") {
    return NextResponse.json({ status: "skipped", reason: "commentary_disabled" });
  }

  // Time check
  if (!isGameTime()) {
    return NextResponse.json({ status: "skipped", reason: "outside_game_hours" });
  }

  try {
    // 1. Fetch all live games
    const liveGames = await fetchAllLiveGames();

    if (liveGames.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_live_games" });
    }

    // 2. Filter to interesting games, fall back to all
    const interestingGames = liveGames.filter((g) => g.isInteresting);
    const pool = interestingGames.length > 0 ? interestingGames : liveGames;

    // 3. Pick ONE random game not on cooldown
    let selectedGame = null;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    for (const game of shuffled) {
      const recent = await hasRecentComment(game.gameId);
      if (!recent) {
        selectedGame = game;
        break;
      }
    }

    if (!selectedGame) {
      return NextResponse.json({ status: "skipped", reason: "all_games_on_cooldown" });
    }

    // 4. Generate commentary
    const comment = await generateCommentary(selectedGame);

    if (!comment) {
      return NextResponse.json({ status: "error", reason: "commentary_generation_failed" });
    }

    // 5. Post to Telegram
    const chatId = process.env.TELEGRAM_FREE_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ status: "error", reason: "telegram_not_configured" });
    }

    const result = await sendTelegramMessage(chatId, comment);

    if (!result.ok) {
      return NextResponse.json({ status: "error", reason: "telegram_send_failed", error: result.error });
    }

    // 6. Log the commentary
    await db.insert(commentaryLog).values({
      id: crypto.randomUUID(),
      gameId: selectedGame.gameId,
      sport: selectedGame.sport,
      message: comment,
      postedAt: Math.floor(Date.now() / 1000),
      gameState: JSON.stringify({
        score: `${selectedGame.score1}-${selectedGame.score2}`,
        period: selectedGame.period,
        clock: selectedGame.clock,
      }),
    });

    return NextResponse.json({
      status: "posted",
      game: `${selectedGame.team1} vs ${selectedGame.team2}`,
      sport: selectedGame.sport,
      comment,
    });
  } catch (error) {
    console.error("[commentary] Cron error:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/live-commentary/route.ts
git commit -m "feat: add live-commentary cron route"
```

---

### Task 5: Win Celebration Templates

**Files:**
- Modify: `src/lib/telegram-templates.ts`

Add the `win_celebration` category to the existing `TEMPLATES` object and update the `getRandomTemplate` type.

- [ ] **Step 1: Update the template type and add win_celebration templates**

In `src/lib/telegram-templates.ts`, change the `getRandomTemplate` function signature (line 8) from:

```typescript
export function getRandomTemplate(
  category: "free_pick" | "vip_teaser" | "vip_update" | "general_update",
  language: "en" | "es"
): string {
```

to:

```typescript
export function getRandomTemplate(
  category: "free_pick" | "vip_teaser" | "vip_update" | "general_update" | "win_celebration",
  language: "en" | "es"
): string {
```

Then add the `win_celebration` category inside the `TEMPLATES` object, after the `general_update` block (before the closing `} as const;` on line 234). Insert before line 234:

```typescript

  // ============================================================
  // CATEGORY 5: WIN CELEBRATION — Posted when auto-settler confirms a win
  // ============================================================
  win_celebration: {
    en: [
      `CASH IT\n\n{pickText}\n{matchup} -- {sport}\n\nAnother one in the books`,
      `Winner winner\n\n{pickText} hits!\n\nThat's what the model does`,
      `CASHED! {pickText}\n{sport}: {matchup}\n\nEasy money`,
      `Hit! {pickText}\n\nThe data doesn't lie`,
      `Another one\n\n{pickText} -- {sport}\nLet's keep it rolling`,
      `{pickText}\n\nSmoked it. {sport}`,
      `Add it to the record\n\n{pickText}\n{matchup}\n\nWe move`,
      `That's a W\n\n{pickText} cashes\n{sport} keeping us fed`,
      `Bingo. {pickText}\n\nModel edge confirmed`,
      `WINNER {pickText}\n\nAnother clean hit for the crew`,
    ],
    es: [
      `COBRADO\n\n{pickText}\n{matchup} -- {sport}\n\nOtro mas para el record`,
      `A cobrar\n\n{pickText} pega!\n\nEso hace el modelo`,
      `COBRADO! {pickText}\n{sport}: {matchup}\n\nDinero facil`,
      `Pega! {pickText}\n\nLos datos no mienten`,
      `Otro mas\n\n{pickText} -- {sport}\nSeguimos sumando`,
      `{pickText}\n\nSin susto. {sport}`,
      `Sumenlo al record\n\n{pickText}\n{matchup}\n\nVamos`,
      `Eso es W\n\n{pickText} cobra\n{sport} nos tiene comiendo`,
      `Bingo. {pickText}\n\nEdge del modelo confirmado`,
      `GANADOR {pickText}\n\nOtra jugada limpia para la familia`,
    ],
  },
```

- [ ] **Step 2: Add the formatWinCelebrationMessage function**

Add after the `formatGeneralUpdateMessage` function (after line 310) in `src/lib/telegram-templates.ts`:

```typescript

/**
 * Format a win celebration message. Single language (randomly chosen by caller).
 */
export function formatWinCelebrationMessage(pick: {
  sport: string;
  matchup: string;
  pickText: string;
}): string {
  const language = Math.random() < 0.6 ? "es" : "en";
  const template = getRandomTemplate("win_celebration", language);

  return template
    .replace(/\{pickText\}/g, pick.pickText)
    .replace(/\{matchup\}/g, pick.matchup)
    .replace(/\{sport\}/g, pick.sport);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram-templates.ts
git commit -m "feat: add win celebration templates for auto-settler integration"
```

---

### Task 6: Telegram Win Celebration Sender

**Files:**
- Modify: `src/lib/telegram.ts`

Add a `sendWinCelebration` function that uses the new templates.

- [ ] **Step 1: Add import for formatWinCelebrationMessage**

In `src/lib/telegram.ts`, update the import block at line 1-4. Change:

```typescript
import {
  formatFreePickMessage as formatFreePickFromTemplates,
  formatVipTeaserMessage as formatVipTeaserFromTemplates,
} from "./telegram-templates";
```

to:

```typescript
import {
  formatFreePickMessage as formatFreePickFromTemplates,
  formatVipTeaserMessage as formatVipTeaserFromTemplates,
  formatWinCelebrationMessage,
} from "./telegram-templates";
```

- [ ] **Step 2: Add the sendWinCelebration function**

Add before the final `export { ... }` line (before line 181) in `src/lib/telegram.ts`:

```typescript
/**
 * Post a win celebration message to the free Telegram group.
 * Called by the auto-settler when a pick is settled as a win.
 * Fire-and-forget — errors are logged but never throw.
 */
export async function sendWinCelebration(pick: {
  sport: string;
  matchup: string;
  pickText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_FREE_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatWinCelebrationMessage(pick);
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message);
}
```

- [ ] **Step 3: Update the final export line**

Change line 181 from:

```typescript
export { formatPickMessage, formatResultMessage, formatVipTeaserMessage };
```

to:

```typescript
export { formatPickMessage, formatResultMessage, formatVipTeaserMessage, sendWinCelebration };
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/telegram.ts
git commit -m "feat: add sendWinCelebration to Telegram module"
```

---

### Task 7: Integrate Win Celebrations into Auto-Settler

**Files:**
- Modify: `src/app/api/cron/settle-picks/route.ts`

Add a win celebration Telegram post after each pick is auto-settled as a win.

- [ ] **Step 1: Add the import**

In `src/app/api/cron/settle-picks/route.ts`, change the import at line 10 from:

```typescript
import { sendAdminNotification } from "@/lib/telegram";
```

to:

```typescript
import { sendAdminNotification, sendWinCelebration } from "@/lib/telegram";
```

- [ ] **Step 2: Add win celebration after auto-settle**

In `src/app/api/cron/settle-picks/route.ts`, after the auto-settle db update (after line 155 — after `log.autoSettled = true;`), add:

```typescript

          // Post win celebration to Telegram (fire-and-forget)
          if (settlement.result === "win") {
            sendWinCelebration({
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
            }).catch((err) =>
              console.error("[settle-picks] Win celebration failed:", err)
            );
          }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/settle-picks/route.ts
git commit -m "feat: post win celebrations to Telegram when picks auto-settle as wins"
```

---

### Task 8: Vercel Cron Configuration & Admin Toggle

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the live-commentary cron to vercel.json**

Add a new entry to the `crons` array in `vercel.json` (after the last cron entry, before the closing `]`):

```json
    {
      "path": "/api/cron/live-commentary",
      "schedule": "*/15 * * * *"
    }
```

The full crons array should end with:

```json
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/live-commentary",
      "schedule": "*/15 * * * *"
    }
  ]
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add live-commentary cron schedule (every 15 min)"
```

**Note on admin toggle:** The `live_commentary_enabled` key is read from the existing `siteContent` table via `getSiteContent()`. To enable the bot, run this in the admin panel or directly:

```sql
INSERT OR REPLACE INTO site_content (key, value, updated_at) 
VALUES ('live_commentary_enabled', 'true', datetime('now'));
```

The bot defaults to **disabled** (key doesn't exist = skipped), so it won't post until you explicitly enable it.

---

### Task 9: Commentary Log Cleanup

**Files:**
- Modify: `src/app/api/cron/live-commentary/route.ts`

Add cleanup of old commentary logs (older than 7 days) at the end of each successful run. One cheap DELETE query, only runs when the cron already successfully posted.

- [ ] **Step 1: Add cleanup logic**

In `src/app/api/cron/live-commentary/route.ts`, add `lte` to the drizzle import. Change:

```typescript
import { eq, and, gte } from "drizzle-orm";
```

to:

```typescript
import { eq, and, gte, lte } from "drizzle-orm";
```

Then add cleanup right before the final `return NextResponse.json({ status: "posted", ... })` block (after the `db.insert` call):

```typescript

    // Cleanup: delete logs older than 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    await db
      .delete(commentaryLog)
      .where(lte(commentaryLog.postedAt, sevenDaysAgo))
      .catch((err) => console.error("[commentary] Cleanup failed:", err));
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/live-commentary/route.ts
git commit -m "feat: add 7-day cleanup for commentary logs"
```

---

## Post-Implementation Checklist

After all tasks are done, verify:

- [ ] `npm run build` passes with no TypeScript errors
- [ ] The `commentary_log` table is created on app startup (auto-migrate)
- [ ] The cron route returns `{ status: "skipped", reason: "commentary_disabled" }` when the toggle is off
- [ ] Setting `live_commentary_enabled` to `true` in `siteContent` enables the bot
- [ ] The `settle-picks` cron still works correctly (win celebrations are fire-and-forget, no impact on settlement logic)
- [ ] `vercel.json` has valid JSON with the new cron entry
