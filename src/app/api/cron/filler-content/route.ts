import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, media } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { getSiteContent } from "@/db/queries/site-content";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";
import { generateMatchupImage } from "@/lib/ai-image";
import { notifyAdmin } from "@/lib/notifications";
import { sendAdminNotification } from "@/lib/telegram";
import { todayET } from "@/lib/timezone";
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
 * Runs once daily at 13:00 UTC (9 AM ET / 8 AM EST) per vercel.json.
 * Generates up to 4 matchup graphics, max 2 per sport, scheduled inside
 * the ET 10am-7pm posting window with random spacing.
 *
 * IDEMPOTENT (atomic): pre-reserves a row per (gameId, dayET) using a
 * deterministic primary key + onConflictDoNothing, so concurrent cron
 * fires (or admin run-now while cron is mid-flight) cannot double-insert
 * the same matchup. Only the row that wins the insert race generates
 * image+caption; collisions exit cheaply with no AI spend.
 */

/** Deterministic id so concurrent crons can't race the dedup check. */
function fillerRowId(gameId: string, dayStampET: string): string {
  return `filler-${dayStampET}-${gameId}`;
}
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

    // 2. Filter: remove teams used in last 24h. Case-insensitive parse so
    //    "Lakers vs Celtics" and "lakers vs celtics" dedup the same.
    const yesterdayISO = new Date(Date.now() - 86400000).toISOString();
    const recentFillers = await db
      .select({ title: contentQueue.title })
      .from(contentQueue)
      .where(and(eq(contentQueue.type, "filler"), gte(contentQueue.createdAt, yesterdayISO)));

    const normalize = (s: string) => s.trim().toLowerCase();
    const recentTeams = new Set(
      recentFillers.flatMap((f) => (f.title || "").split(/\s+vs\s+/i).map(normalize)).filter(Boolean)
    );

    const scored = allGames
      .filter((g) => {
        if (recentTeams.has(normalize(g.team1)) || recentTeams.has(normalize(g.team2))) return false;
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

    // 6. ATOMIC CLAIM — pre-insert a placeholder row per game using a
    // deterministic primary key (filler-{dayET}-{gameId}). onConflictDoNothing
    // means concurrent crons silently lose the race instead of double-spending
    // on image + caption generation. We only generate for games whose claim
    // we actually won.
    const dayET = todayET();
    const claimResults = await Promise.all(
      selected.map(async (game) => {
        const title = `${game.team1} vs ${game.team2}`;
        const scheduledAt = scheduleTimes.get(game.gameId) || now;
        const time = new Date(game.startTime).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
        });
        const claimed = await db
          .insert(contentQueue)
          .values({
            id: fillerRowId(game.gameId, dayET),
            type: "filler",
            referenceId: game.gameId,
            title,
            preview: `${game.sport} — ${time} ET`,
            platform: "all",
            status: "draft", // upgraded to "scheduled" once content is generated
            scheduledAt: scheduledAt.toISOString(),
          })
          .onConflictDoNothing()
          .returning({ id: contentQueue.id });
        return { game, time, scheduledAt, won: claimed.length > 0 };
      })
    );

    const winners = claimResults.filter((r) => r.won);
    const skippedDuplicates = claimResults.length - winners.length;
    if (skippedDuplicates > 0) {
      console.log(`[filler] Skipped ${skippedDuplicates} duplicate claim(s) — another cron run already reserved`);
    }

    // 7. Generate image + captions only for games we successfully claimed.
    // IN PARALLEL so 4 games finish in the time of 1.
    let generated = 0;
    let skipped = skippedDuplicates;
    const imageGenFailures: string[] = [];

    const results = await Promise.all(
      winners.map(async ({ game, time, scheduledAt }) => {
        const title = `${game.team1} vs ${game.team2}`;
        const rowId = fillerRowId(game.gameId, dayET);
        try {
          console.log(`[filler] Generating image + captions in parallel: ${title}`);
          const [imageResult, captions] = await Promise.all([
            generateMatchupImage(title, game.sport, game.team1, game.team2),
            generateBilingualFillerCaption(game, time),
          ]);

          if (imageResult.error || !imageResult.url) {
            console.error(`[filler] Image failed for ${title}:`, imageResult.error);
            imageGenFailures.push(`${title} — ${imageResult.error || "no url returned"}`);
            // Mark the claim row as failed so it doesn't block tomorrow's retry.
            await db
              .update(contentQueue)
              .set({ status: "failed", error: `image_gen_failed: ${imageResult.error || "no url"}` })
              .where(eq(contentQueue.id, rowId));
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
                height: 1350,
                altText: `${game.sport} matchup: ${title}`,
              })
              .catch((err) => console.error(`[filler] Media insert failed:`, err));
          }

          // Promote the placeholder draft row to scheduled with full content.
          await db
            .update(contentQueue)
            .set({
              imageUrl: imageResult.url,
              threadsImageUrl: imageResult.threadsUrl || null,
              telegramImageUrl: imageResult.telegramUrl || null,
              captionEn: captions.en,
              captionEs: captions.es,
              hashtags: generateHashtags(game),
              status: "scheduled",
            })
            .where(eq(contentQueue.id, rowId));

          const ptStr = scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" });
          console.log(`[filler] Created: ${title} → scheduled for ${ptStr} ET`);
          return { ok: true as const };
        } catch (error) {
          console.error(`[filler] Failed for ${title}:`, error);
          await db
            .update(contentQueue)
            .set({ status: "failed", error: `generation_threw: ${error instanceof Error ? error.message : String(error)}` })
            .where(eq(contentQueue.id, rowId))
            .catch(() => {});
          return { ok: false as const };
        }
      })
    );

    generated = results.filter((r) => r.ok).length;
    skipped += results.filter((r) => !r.ok).length;

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
      duplicatesSkipped: skippedDuplicates,
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

/**
 * Generate BOTH English and Spanish (Miami vibe) captions in a SINGLE
 * Claude call. Halves Anthropic spend vs the previous two-call approach,
 * and keeps both versions thematically consistent (same hooks, same emojis).
 *
 * Returns { en, es } even on partial parse failure (best-effort split).
 */
async function generateBilingualFillerCaption(
  game: ScheduledGame,
  time: string
): Promise<{ en: string; es: string }> {
  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      // System block is identical across all matchups — Anthropic prompt
      // caching makes this read-cheap once warm, saving ~50% input tokens.
      system: [
        {
          type: "text",
          text: `You write short pre-game Instagram captions for WinFact Picks (@winfact_picks).
RULES (apply to every output):
- Max 4-5 lines
- 1 sport emoji + 1 emoji per team
- Mention both teams; reference real context only (no fake stats, no hype)
- End with a simple interaction (English: "Who you got?" / "Big one tonight" — Spanish: "¿Quién gana hoy?" / "Esto va estar bueno")
- Close with 8-12 hashtags (teams, league, sport, generic sports)
- Avoid betting terms ("sharp", "lock", "parlay")`,
          cache_control: { type: "ephemeral" },
        } as unknown as { type: "text"; text: string },
      ],
      messages: [{
        role: "user",
        content: `Game: ${game.team1} vs ${game.team2}
Sport: ${game.sport}
Time: ${time} ET
${game.team1Record ? `Records: ${game.team1} (${game.team1Record}) vs ${game.team2} (${game.team2Record})` : ""}

Output BOTH versions, exactly in this format with the literal markers:

===EN===
<English caption + hashtags>

===ES===
<Spanish (Latin American, Miami vibe) caption + hashtags>`,
      }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const enMatch = raw.match(/===EN===\s*([\s\S]*?)(?:===ES===|$)/i);
    const esMatch = raw.match(/===ES===\s*([\s\S]*?)$/i);
    return {
      en: enMatch?.[1]?.trim() || raw,
      es: esMatch?.[1]?.trim() || "",
    };
  } catch (error) {
    console.error("[filler] Bilingual caption generation failed:", error);
    return { en: "", es: "" };
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
