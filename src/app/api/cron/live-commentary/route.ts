import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog, siteContent } from "@/db/schema";
import { inArray, lte } from "drizzle-orm";
import { fetchAllLiveGames } from "@/lib/espn-live";
import { sendTelegramMessage, sendAdminNotification } from "@/lib/telegram";
import { getSiteContent } from "@/db/queries/site-content";
import { postLiveToBuffer } from "@/lib/buffer";
import {
  toGameContext,
  computeGameDelta,
  detectCategory,
  generateMessage,
  CATEGORY_CHANNELS,
  type Language,
  type MessageCategory,
} from "@/lib/commentary";

// Defaults — overridden by siteContent settings if configured
const DEFAULT_WEEKDAY_START = 12;
const DEFAULT_WEEKDAY_END = 1; // 1 AM next day (wraps past midnight)
const DEFAULT_WEEKEND_START = 10;
const DEFAULT_WEEKEND_END = 1;

type CommentarySettings = {
  weekdayStart: number;
  weekdayEnd: number;
  weekendStart: number;
  weekendEnd: number;
};

async function loadSettings(): Promise<CommentarySettings> {
  const keys = [
    "commentary_weekday_start_hour",
    "commentary_weekday_end_hour",
    "commentary_weekend_start_hour",
    "commentary_weekend_end_hour",
  ];
  const rows = await db.select().from(siteContent).where(inArray(siteContent.key, keys));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    weekdayStart: parseInt(map.get("commentary_weekday_start_hour") || "") || DEFAULT_WEEKDAY_START,
    weekdayEnd: parseInt(map.get("commentary_weekday_end_hour") || "") || DEFAULT_WEEKDAY_END,
    weekendStart: parseInt(map.get("commentary_weekend_start_hour") || "") || DEFAULT_WEEKEND_START,
    weekendEnd: parseInt(map.get("commentary_weekend_end_hour") || "") || DEFAULT_WEEKEND_END,
  };
}

function isGameTime(settings: CommentarySettings): boolean {
  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })
  );
  const etDay = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short" });
  const isWeekend = etDay === "Sat" || etDay === "Sun";
  const start = isWeekend ? settings.weekendStart : settings.weekdayStart;
  const end = isWeekend ? settings.weekendEnd : settings.weekdayEnd;
  if (end < start) return etHour >= start || etHour <= end;
  return etHour >= start && etHour <= end;
}

// Priority order when multiple games qualify for different categories this tick.
// Higher-impact events beat generic reactions.
const PRIORITY: Record<MessageCategory, number> = {
  big_play: 5,
  final: 4,
  pick_update: 3,
  pre_game: 2,
  game_reaction: 1,
};

export async function GET(req: Request) {
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

  const settings = await loadSettings();
  if (!isGameTime(settings)) {
    return NextResponse.json({ status: "skipped", reason: "outside_game_hours" });
  }

  try {
    // 1. Fetch live games
    const liveGames = await fetchAllLiveGames();
    if (liveGames.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_live_games" });
    }

    // 2. For every game, compute delta + detect a category. Collect candidates.
    type Candidate = {
      game: typeof liveGames[number];
      category: MessageCategory;
      delta: Awaited<ReturnType<typeof computeGameDelta>>;
      reason: string;
    };
    const candidates: Candidate[] = [];
    for (const g of liveGames) {
      const delta = await computeGameDelta(g);
      const det = await detectCategory(g, delta);
      if (det.category) {
        candidates.push({ game: g, category: det.category, delta, reason: det.reason });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_eligible_games", games: liveGames.length });
    }

    // 3. Pick the highest-priority candidate; break ties randomly
    candidates.sort((a, b) => {
      const diff = PRIORITY[b.category] - PRIORITY[a.category];
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });
    const pick = candidates[0];

    // 4. Choose language (~60% Spanish to match audience)
    const language: Language = Math.random() < 0.6 ? "es" : "en";

    // 5. Generate — retries once internally on style-guard failure
    const ctx = toGameContext(pick.game);
    const result =
      pick.category === "big_play"
        ? await generateMessage({ category: pick.category, game: ctx, delta: pick.delta, language })
        : await generateMessage({ category: pick.category, game: ctx, language });

    if (!result.ok) {
      return NextResponse.json({
        status: "skipped",
        reason: result.reason,
        category: pick.category,
        game: `${pick.game.team1} vs ${pick.game.team2}`,
      });
    }

    // 6. Distribute per CATEGORY_CHANNELS
    const routing = CATEGORY_CHANNELS[pick.category];
    let telegramSent = false;
    let bufferSent = false;

    if (routing.telegram) {
      const chatId = process.env.TELEGRAM_FREE_CHAT_ID;
      if (chatId) {
        const tg = await sendTelegramMessage(chatId, result.message, { parseMode: "none" }).catch((err) => {
          console.error("[commentary] Telegram threw:", err);
          return { ok: false, error: String(err) };
        });
        telegramSent = tg.ok;
        if (!tg.ok) console.error("[commentary] Telegram failed:", tg.error);
      }
    }

    if (routing.buffer) {
      const hasBufferToken = !!(process.env.BUFFER_LIVE_TOKEN || process.env.BUFFER_ACCESS_TOKEN);
      if (!hasBufferToken) {
        console.error("[commentary] Buffer SKIPPED: neither BUFFER_LIVE_TOKEN nor BUFFER_ACCESS_TOKEN is set");
      } else {
        const buf = await postLiveToBuffer(result.message).catch((err) => {
          console.error("[commentary] Buffer threw:", err);
          return { ok: false, error: String(err) } as const;
        });
        bufferSent = buf.ok;
        if (!buf.ok) {
          console.error(`[commentary] Buffer FAILED (${pick.category}): ${buf.error}`);
          sendAdminNotification(
            `⚠️ Live commentary Buffer post failed\nCategory: ${pick.category}\nGame: ${pick.game.team1} vs ${pick.game.team2}\nError: ${buf.error || "unknown"}`
          ).catch(() => {});
        }
      }
    }

    // 7. Log (always — even if distribution partially failed, the message existed)
    await db.insert(commentaryLog).values({
      id: crypto.randomUUID(),
      gameId: pick.game.gameId,
      sport: pick.game.sport,
      message: result.message,
      postedAt: Math.floor(Date.now() / 1000),
      gameState: JSON.stringify({
        score: `${pick.game.score1}-${pick.game.score2}`,
        period: pick.game.period,
        clock: pick.game.clock,
      }),
      category: pick.category,
      bucket: result.bucket,
      language: result.language,
    });

    // 8. Cleanup: delete rows older than 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    db.delete(commentaryLog)
      .where(lte(commentaryLog.postedAt, sevenDaysAgo))
      .catch((err) => console.error("[commentary] Cleanup failed:", err));

    return NextResponse.json({
      status: "posted",
      category: pick.category,
      categoryReason: pick.reason,
      game: `${pick.game.team1} vs ${pick.game.team2}`,
      sport: pick.game.sport,
      language: result.language,
      bucket: result.bucket,
      channels: {
        telegram: telegramSent,
        telegramRoutedTo: routing.telegram,
        buffer: bufferSent,
        bufferRoutedTo: routing.buffer,
        bufferTokenSet: !!(process.env.BUFFER_LIVE_TOKEN || process.env.BUFFER_ACCESS_TOKEN),
      },
      message: result.message,
      candidatesConsidered: candidates.length,
    });
  } catch (error) {
    console.error("[commentary] Cron error:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
