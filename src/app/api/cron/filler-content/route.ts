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

// Filler generates N images × 20-30s each + captions. Vercel's default is
// 300s on current plans but some routes may have a lower override. Pin to
// 300s explicitly so parallel image generation has room to finish.
export const maxDuration = 300;

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

    // 4. Select exactly 4 games (max 2 per sport). Falls back to <4 if not enough fresh games.
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

    // 5. Assign RANDOM scheduledAt times spread across 10am-7pm ET.
    //    4 buckets, each picks a random time within a 75-min subwindow so
    //    there's always at least ~60min gap between successive fillers.
    //    Feels organic on IG/FB instead of "identical-cadence bot".
    const now = new Date();
    const scheduleTimes: Map<string, Date> = new Map();
    const randomizedTimes = pickRandomFillerTimes(now, selected.length);
    // If cron fires late and some slots are already in the past, push them to
    // "~5 min from now" one by one so we don't drop anything.
    const minForwardMs = 5 * 60 * 1000;
    let lastScheduled = now.getTime() - minForwardMs;
    for (let i = 0; i < selected.length; i++) {
      const target = randomizedTimes[i];
      let at = target;
      if (at.getTime() < now.getTime() + minForwardMs) {
        at = new Date(Math.max(now.getTime() + minForwardMs, lastScheduled + MIN_GAP_MS));
      }
      if (at.getTime() < lastScheduled + MIN_GAP_MS) {
        at = new Date(lastScheduled + MIN_GAP_MS);
      }
      scheduleTimes.set(selected[i].gameId, at);
      lastScheduled = at.getTime();
    }

    // 6. Generate content for each game — IN PARALLEL so 4 games finish in
    // the time of 1 (image + captions each take ~30s; sequential = 120s+).
    let generated = 0;
    let skipped = 0;
    const imageGenFailures: string[] = [];

    const results = await Promise.all(
      selected.map(async (game) => {
        const title = `${game.team1} vs ${game.team2}`;
        const time = new Date(game.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/New_York",
        });
        try {
          console.log(`[filler] Generating image + captions in parallel: ${title}`);
          const [imageResult, captionEn, captionEs] = await Promise.all([
            generateMatchupImage(title, game.sport, game.team1, game.team2),
            generateFillerCaption(game, time, "English"),
            generateFillerCaption(game, time, "Spanish (Latin American, Miami vibe)"),
          ]);

          if (imageResult.error || !imageResult.url) {
            console.error(`[filler] Image failed for ${title}:`, imageResult.error);
            imageGenFailures.push(`${title} — ${imageResult.error || "no url returned"}`);
            return { ok: false as const };
          }

          if (imageResult.url && imageResult.filename) {
            await db
              .insert(media)
              .values({
                id: crypto.randomUUID(),
                filename: imageResult.filename,
                url: imageResult.url,
                mimeType: "image/png",
                width: 1080,
                height: 1350, // 4:5 ratio for IG/FB/X/Threads compatibility
                altText: `${game.sport} matchup: ${title}`,
              })
              .catch((err) => console.error(`[filler] Media insert failed:`, err));
          }

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

          const ptStr = scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" });
          console.log(`[filler] Created: ${title} → scheduled for ${ptStr} ET`);
          return { ok: true as const };
        } catch (error) {
          console.error(`[filler] Failed for ${title}:`, error);
          return { ok: false as const };
        }
      })
    );

    generated = results.filter((r) => r.ok).length;
    skipped = results.filter((r) => !r.ok).length;

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

/**
 * Pick N random scheduledAt times between 10am and 7pm ET for today (or
 * tomorrow if it's already past 7pm). Window is 9 hours = 540 minutes,
 * divided into N buckets; within each bucket a random offset in the
 * first (bucket-width - 60) minutes is selected, guaranteeing ~60min min
 * gap to the next post. Feels organic, not identical-cadence.
 */
function pickRandomFillerTimes(now: Date, count: number): Date[] {
  const windowStartHourET = 10;
  const windowEndHourET = 19; // 7pm
  const windowMinutes = (windowEndHourET - windowStartHourET) * 60;

  // Build "today 10am ET" as a Date in UTC. Determine ET offset from current date.
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parseInt(etParts.find((p) => p.type === t)?.value || "0");
  const etYear = get("year");
  const etMonth = get("month") - 1;
  const etDay = get("day");
  const etHour = get("hour");

  // If it's already past 7pm ET, shift to tomorrow. Filler cron fires 9am ET
  // so this branch is unlikely but defensive.
  let targetDay = etDay;
  if (etHour >= windowEndHourET) targetDay = etDay + 1;

  // Probe hour to derive current ET→UTC offset (accounts for DST automatically).
  const probe = new Date(Date.UTC(etYear, etMonth, targetDay, 12, 0, 0));
  const probeHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(probe)
  );
  const offsetHours = probeHour - 12; // -4 for EDT, -5 for EST

  // 10am ET → UTC
  const windowStartUTC = new Date(
    Date.UTC(etYear, etMonth, targetDay, windowStartHourET - offsetHours, 0, 0)
  ).getTime();

  const bucketWidth = Math.floor(windowMinutes / count);
  const jitterMax = Math.max(0, bucketWidth - 60); // 60-min min gap

  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    const bucketStart = i * bucketWidth;
    const jitter = jitterMax > 0 ? Math.floor(Math.random() * jitterMax) : 0;
    const offsetMin = bucketStart + jitter;
    times.push(new Date(windowStartUTC + offsetMin * 60 * 1000));
  }
  return times;
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
