import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { getSiteContent } from "@/db/queries/site-content";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";
import { generateMatchupImage } from "@/lib/ai-image";
import { notifyAdmin } from "@/lib/notifications";
import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

type ScheduledGame = {
  gameId: string;
  sport: string;
  team1: string;
  team2: string;
  team1Record: string;
  team2Record: string;
  startTime: string;
};

const FILLER_SPORTS = ["NBA", "MLB", "NFL"];

const RIVALRIES = [
  ["Yankees", "Red Sox"], ["Lakers", "Celtics"], ["Cowboys", "Eagles"],
  ["Dodgers", "Giants"], ["Bears", "Packers"], ["Cubs", "Cardinals"],
  ["Warriors", "Cavaliers"], ["Steelers", "Ravens"], ["Heat", "Knicks"],
  ["Mets", "Yankees"], ["Chiefs", "Raiders"], ["49ers", "Seahawks"],
  ["Braves", "Phillies"], ["Nets", "Knicks"], ["Clippers", "Lakers"],
  ["Astros", "Rangers"], ["Packers", "Bears"], ["Bills", "Dolphins"],
];

/**
 * GET /api/cron/filler-content
 *
 * Daily cron: selects top 3-4 anticipated games, generates matchup
 * graphics + bilingual captions, saves as drafts in content queue.
 * Schedule: 1:00 PM ET (17:00 UTC)
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check toggle
  const enabled = await getSiteContent("filler_content_enabled");
  if (enabled !== "true") {
    return NextResponse.json({ status: "skipped", reason: "filler_disabled" });
  }

  try {
    // 1. Fetch today's scheduled games for NBA, MLB, NFL
    const date = toESPNDate();
    const allGames: ScheduledGame[] = [];

    for (const sport of FILLER_SPORTS) {
      const scoreboard = await fetchScoreboard(sport, date);
      for (const game of scoreboard) {
        if (game.status !== "pre") continue; // Only upcoming games
        allGames.push({
          gameId: game.id,
          sport,
          team1: game.awayTeam,
          team2: game.homeTeam,
          team1Record: "", // ESPN scoreboard doesn't always include records
          team2Record: "",
          startTime: game.startTime,
        });
      }
    }

    if (allGames.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_games_today" });
    }

    // 2. Get teams used yesterday to avoid repeats
    const yesterdayISO = new Date(Date.now() - 86400000).toISOString();
    const recentFillers = await db
      .select({ title: contentQueue.title })
      .from(contentQueue)
      .where(and(eq(contentQueue.type, "filler"), gte(contentQueue.createdAt, yesterdayISO)));

    const recentTeams = new Set(
      recentFillers.flatMap((f) => f.title?.split(" vs ") || [])
    );

    // 3. Score and sort games
    const scored = allGames
      .filter((g) => !recentTeams.has(g.team1) && !recentTeams.has(g.team2))
      .map((g) => ({ ...g, score: scoreAnticipation(g) }))
      .sort((a, b) => b.score - a.score);

    // 4. Select top 3-4 games (max 2 per sport)
    const selected: ScheduledGame[] = [];
    const sportCount: Record<string, number> = {};

    for (const game of scored) {
      if (selected.length >= 4) break;
      const count = sportCount[game.sport] || 0;
      if (count >= 2) continue;
      selected.push(game);
      sportCount[game.sport] = count + 1;
    }

    if (selected.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_fresh_games" });
    }

    // 5. Generate content for each game
    let generated = 0;

    for (const game of selected) {
      try {
        const title = `${game.team1} vs ${game.team2}`;
        const time = new Date(game.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/New_York",
        });

        // Generate matchup image (feed size)
        console.log(`[filler] Generating image: ${title}`);
        const imageResult = await generateMatchupImage(
          title,
          game.sport,
          game.team1,
          game.team2
        );

        if (imageResult.error || !imageResult.url) {
          console.error(`[filler] Image failed for ${title}:`, imageResult.error);
          continue;
        }

        // Generate bilingual captions
        console.log(`[filler] Generating captions: ${title}`);
        const [captionEn, captionEs] = await Promise.all([
          generateFillerCaption(game, time, "English"),
          generateFillerCaption(game, time, "Spanish (Latin American, Miami vibe)"),
        ]);

        // Insert into content queue
        await db.insert(contentQueue).values({
          id: crypto.randomUUID(),
          type: "filler",
          referenceId: game.gameId,
          title,
          preview: `${game.sport} — ${time} ET`,
          imageUrl: imageResult.url,
          captionEn: captionEn || "",
          captionEs: captionEs || "",
          hashtags: generateHashtags(game),
          platform: "all",
          status: "draft",
        });

        generated++;
        console.log(`[filler] Created: ${title}`);
      } catch (error) {
        console.error(`[filler] Failed for ${game.team1} vs ${game.team2}:`, error);
      }
    }

    // 6. Notify Oscar
    if (generated > 0) {
      const gameList = selected.slice(0, generated).map((g) => `• ${g.sport}: ${g.team1} vs ${g.team2}`).join("\n");
      await notifyAdmin({
        subject: `🎨 ${generated} Filler Graphics Ready`,
        telegramMessage:
          `🎨 <b>Filler Content Ready</b>\n\n` +
          `${generated} matchup graphics generated:\n${gameList}\n\n` +
          `💡 Review: /admin/content-queue`,
        emailHtml: `<p>${generated} filler matchup graphics have been generated and are ready for review.</p><p>${gameList.replace(/\n/g, "<br/>")}</p>`,
      });
    }

    return NextResponse.json({ status: "done", generated, total: selected.length });
  } catch (error) {
    console.error("[filler] Cron error:", error);
    return NextResponse.json({ error: "Failed to generate filler content" }, { status: 500 });
  }
}

function scoreAnticipation(game: ScheduledGame): number {
  let score = 0;

  // Rivalry bonus
  const isRivalry = RIVALRIES.some(([a, b]) =>
    (game.team1.includes(a) && game.team2.includes(b)) ||
    (game.team1.includes(b) && game.team2.includes(a))
  );
  if (isRivalry) score += 30;

  // Winning record bonus
  const parseWinPct = (record: string) => {
    const match = record.match(/(\d+)-(\d+)/);
    if (!match) return 0.5;
    const w = parseInt(match[1]), l = parseInt(match[2]);
    return w / (w + l || 1);
  };
  score += (parseWinPct(game.team1Record) + parseWinPct(game.team2Record)) * 20;

  // Evening game bonus (primetime)
  const gameHour = new Date(game.startTime).getUTCHours();
  // 23-03 UTC = 7-11 PM ET = primetime
  if (gameHour >= 23 || gameHour <= 3) score += 10;

  return score;
}

async function generateFillerCaption(
  game: ScheduledGame,
  time: string,
  language: string
): Promise<string> {
  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Generate an Instagram caption for a pre-game matchup graphic by WinFact Picks (@winfact_picks).

Game: ${game.team1} vs ${game.team2}
Sport: ${game.sport}
Time: ${time} ET
${game.team1Record ? `Records: ${game.team1} (${game.team1Record}) vs ${game.team2} (${game.team2Record})` : ""}

Language: ${language}

RULES:
- Max 4-5 lines
- Use 1 sport emoji + 1 emoji per team
- Mention teams, key context if available
- End with simple interaction ("Who you got?" / "Big one tonight" / "Quién gana hoy?")
- Close with 8-12 hashtags: teams, league, sport, general sports
- Avoid betting terms (no "sharp", "lock", "parlay")
- No hype, no fake stats. Only reference real info provided.
- Output ONLY the caption with hashtags. No preamble.`,
      }],
    });

    return response.content[0].type === "text" ? response.content[0].text.trim() : "";
  } catch (error) {
    console.error("[filler] Caption generation failed:", error);
    return "";
  }
}

function generateHashtags(game: ScheduledGame): string {
  const sportTag: Record<string, string> = {
    NBA: "#NBA #Basketball",
    MLB: "#MLB #Baseball",
    NFL: "#NFL #Football",
  };
  const team1Tag = `#${game.team1.replace(/\s+/g, "")}`;
  const team2Tag = `#${game.team2.replace(/\s+/g, "")}`;
  return `${team1Tag} ${team2Tag} ${sportTag[game.sport] || ""} #Sports #WinFactPicks #GameDay`.trim();
}
