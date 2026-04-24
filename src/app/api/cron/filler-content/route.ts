import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, media } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getSiteContent } from "@/db/queries/site-content";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";
import { generateMatchupImage } from "@/lib/ai-image";
import { notifyAdmin } from "@/lib/notifications";
import { sendAdminNotification } from "@/lib/telegram";
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
const MIN_GAP_MS = 10 * 60 * 1000; // 10 minutes between scheduled posts

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
 * Runs twice daily (9 AM ET + 1 PM ET) to generate matchup graphics.
 * IDEMPOTENT: skips games already in the queue (checks by gameId).
 * Pre-staggers scheduledAt times to enforce 30-min gaps between posts.
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

  const enabled = await getSiteContent("filler_content_enabled");
  if (enabled !== "true") {
    console.warn(`[filler] Filler content is DISABLED. Current value: "${enabled}". Set site_content key "filler_content_enabled" to "true" to enable.`);
    return NextResponse.json({ status: "skipped", reason: "filler_disabled", currentValue: enabled || "not set" });
  }

  try {
    // 1. Fetch today's scheduled games
    const date = toESPNDate();
    const allGames: ScheduledGame[] = [];

    for (const sport of FILLER_SPORTS) {
      const scoreboard = await fetchScoreboard(sport, date);
      for (const game of scoreboard) {
        if (game.status !== "pre") continue;
        allGames.push({
          gameId: game.id,
          sport,
          team1: game.awayTeam,
          team2: game.homeTeam,
          team1Record: "",
          team2Record: "",
          startTime: game.startTime,
        });
      }
    }

    if (allGames.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_games_today" });
    }

    // 2. IDEMPOTENT CHECK — find games already in queue (by gameId)
    const gameIds = allGames.map(g => g.gameId);
    const existing = await db
      .select({ referenceId: contentQueue.referenceId })
      .from(contentQueue)
      .where(and(
        eq(contentQueue.type, "filler"),
        inArray(contentQueue.referenceId, gameIds)
      ));
    const existingIds = new Set(existing.map(e => e.referenceId));

    // 3. Filter: remove duplicates + teams used in last 24h
    const yesterdayISO = new Date(Date.now() - 86400000).toISOString();
    const recentFillers = await db
      .select({ title: contentQueue.title })
      .from(contentQueue)
      .where(and(eq(contentQueue.type, "filler"), gte(contentQueue.createdAt, yesterdayISO)));

    const recentTeams = new Set(
      recentFillers.flatMap((f) => f.title?.split(" vs ") || [])
    );

    const scored = allGames
      .filter((g) => {
        if (existingIds.has(g.gameId)) {
          console.log(`[filler] Skipping ${g.team1} vs ${g.team2} — already in queue`);
          return false;
        }
        if (recentTeams.has(g.team1) || recentTeams.has(g.team2)) return false;
        return true;
      })
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

    // 5. Pre-calculate staggered scheduledAt times
    const now = new Date();
    const sortedByGameTime = [...selected].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const scheduleTimes: Map<string, Date> = new Map();
    let prevSchedule: Date | null = null;

    for (const game of sortedByGameTime) {
      const gameStart = new Date(game.startTime);
      let postAt = new Date(gameStart.getTime() - 2.5 * 60 * 60 * 1000);

      // Enforce minimum gap from previous scheduled item
      if (prevSchedule && postAt.getTime() - prevSchedule.getTime() < MIN_GAP_MS) {
        // Push this one earlier (sooner, not later) to maintain gap
        postAt = new Date(prevSchedule.getTime() + MIN_GAP_MS);
      }

      // Never schedule in the past
      if (postAt <= now) {
        postAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min from now
      }

      // Never schedule after game start
      if (postAt >= gameStart) {
        postAt = new Date(gameStart.getTime() - 30 * 60 * 1000); // 30 min before game
        if (postAt <= now) postAt = new Date(now.getTime() + 2 * 60 * 1000);
      }

      scheduleTimes.set(game.gameId, postAt);
      prevSchedule = postAt;
    }

    // 6. Generate content for each game
    let generated = 0;
    let skipped = 0;
    const imageGenFailures: string[] = [];

    for (const game of selected) {
      try {
        const title = `${game.team1} vs ${game.team2}`;
        const time = new Date(game.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/New_York",
        });

        console.log(`[filler] Generating image: ${title}`);
        const imageResult = await generateMatchupImage(title, game.sport, game.team1, game.team2);

        if (imageResult.error || !imageResult.url) {
          console.error(`[filler] Image failed for ${title}:`, imageResult.error);
          // Alert admin so silent image-gen breakage stops looking like "filler disabled"
          imageGenFailures.push(`${title} — ${imageResult.error || "no url returned"}`);
          skipped++;
          continue;
        }

        if (imageResult.url && imageResult.filename) {
          await db.insert(media).values({
            id: crypto.randomUUID(),
            filename: imageResult.filename,
            url: imageResult.url,
            mimeType: "image/png",
            width: 1080,
            height: 1440,
            altText: `${game.sport} matchup: ${title}`,
          }).catch((err) => console.error(`[filler] Media insert failed:`, err));
        }

        console.log(`[filler] Generating captions: ${title}`);
        const [captionEn, captionEs] = await Promise.all([
          generateFillerCaption(game, time, "English"),
          generateFillerCaption(game, time, "Spanish (Latin American, Miami vibe)"),
        ]);

        const scheduledAt = scheduleTimes.get(game.gameId) || now;

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
          status: "scheduled",
          scheduledAt: scheduledAt.toISOString(),
        });

        generated++;
        const ptStr = scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" });
        console.log(`[filler] Created: ${title} → scheduled for ${ptStr} ET`);
      } catch (error) {
        console.error(`[filler] Failed for ${game.team1} vs ${game.team2}:`, error);
        skipped++;
      }
    }

    if (generated > 0) {
      const gameList = selected.slice(0, generated).map((g) => {
        const st = scheduleTimes.get(g.gameId);
        const ptStr = st ? st.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" }) : "ASAP";
        return `• ${g.sport}: ${g.team1} vs ${g.team2} (posts ~${ptStr} ET)`;
      }).join("\n");
      await notifyAdmin({
        subject: `🎨 ${generated} Filler Graphics Auto-Scheduled`,
        telegramMessage:
          `🎨 <b>Filler Content Auto-Scheduled</b>\n\n` +
          `${generated} matchup graphics generated & scheduled:\n${gameList}\n\n` +
          `💡 Review: /admin/content-queue`,
        emailHtml: `<p>${generated} filler matchup graphics have been generated.</p><p>${gameList.replace(/\n/g, "<br/>")}</p>`,
      });
    }

    // If EVERY candidate failed image generation, alert admin loudly — this usually
    // means the OpenAI key/quota is broken or R2 is misconfigured, which silently
    // starves Instagram + other channels of visual content.
    if (imageGenFailures.length > 0 && generated === 0 && selected.length > 0) {
      sendAdminNotification(
        `⚠️ <b>Filler cron: ALL ${imageGenFailures.length} images failed</b>\n\n` +
          `No filler posts were generated this tick. This starves Instagram + Facebook/X/Threads of visual content.\n\n` +
          `Failures:\n${imageGenFailures.slice(0, 5).join("\n")}\n\n` +
          `Check OPENAI_API_KEY, OpenAI quota, and R2 config.`
      ).catch(() => {});
    }

    return NextResponse.json({
      status: "done",
      generated,
      skipped,
      imageGenFailures: imageGenFailures.length,
      duplicatesSkipped: existingIds.size,
      total: selected.length,
    });
  } catch (error) {
    console.error("[filler] Cron error:", error);
    return NextResponse.json({ error: "Failed to generate filler content" }, { status: 500 });
  }
}

function scoreAnticipation(game: ScheduledGame): number {
  let score = 0;
  const isRivalry = RIVALRIES.some(([a, b]) =>
    (game.team1.includes(a) && game.team2.includes(b)) ||
    (game.team1.includes(b) && game.team2.includes(a))
  );
  if (isRivalry) score += 30;

  const parseWinPct = (record: string) => {
    const match = record.match(/(\d+)-(\d+)/);
    if (!match) return 0.5;
    const w = parseInt(match[1]), l = parseInt(match[2]);
    return w / (w + l || 1);
  };
  score += (parseWinPct(game.team1Record) + parseWinPct(game.team2Record)) * 20;

  const gameHour = new Date(game.startTime).getUTCHours();
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
