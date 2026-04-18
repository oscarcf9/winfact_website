import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog, siteContent } from "@/db/schema";
import { inArray, lte } from "drizzle-orm";
import { fetchAllLiveGames } from "@/lib/espn-live";
import { sendTelegramMessage, sendAdminNotification } from "@/lib/telegram";
import { getSiteContent } from "@/db/queries/site-content";
import { postLiveToBuffer, BufferConfigError } from "@/lib/buffer";
import { enqueueCommentaryRetry } from "@/lib/commentary-retry";
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

    // 4. Choose language for Telegram. Buffer is always English.
    //    Telegram: 90% Spanish (pure Spanish + Spanglish via prompt guidance)
    //              10% English (for contexts where English is more natural)
    const telegramLanguage: Language = Math.random() < 0.9 ? "es" : "en";

    // 5. Generate per-channel. Fix 7: two separate Claude calls — one for
    //    Telegram (Miami community voice) and one for Buffer (professional
    //    observer voice) — ONLY when the category routes to both channels.
    //    pick_update is Telegram-only per CATEGORY_CHANNELS.
    const ctx = toGameContext(pick.game);
    const routing = CATEGORY_CHANNELS[pick.category];

    const gameStateJson = JSON.stringify({
      score: `${pick.game.score1}-${pick.game.score2}`,
      period: pick.game.period,
      clock: pick.game.clock,
    });

    type GenArgs = Parameters<typeof generateMessage>[0];
    const baseArgs = (channel: "telegram" | "buffer"): GenArgs => {
      const args: GenArgs = {
        category: pick.category,
        game: ctx,
        language: channel === "telegram" ? telegramLanguage : "en",
        channel,
      };
      if (pick.category === "big_play") {
        args.delta = pick.delta;
      }
      return args;
    };

    const [telegramResult, bufferResult] = await Promise.all([
      routing.telegram ? generateMessage(baseArgs("telegram")) : Promise.resolve(null),
      routing.buffer ? generateMessage(baseArgs("buffer")) : Promise.resolve(null),
    ]);

    if (
      (routing.telegram && (!telegramResult || !telegramResult.ok)) &&
      (routing.buffer && (!bufferResult || !bufferResult.ok))
    ) {
      return NextResponse.json({
        status: "skipped",
        reason: "both_channels_failed_generation",
        telegramReason: telegramResult && !telegramResult.ok ? telegramResult.reason : null,
        bufferReason: bufferResult && !bufferResult.ok ? bufferResult.reason : null,
        category: pick.category,
        game: `${pick.game.team1} vs ${pick.game.team2}`,
      });
    }

    let telegramSent = false;
    let bufferSent = false;
    const bufferFailedChannels: string[] = [];
    let telegramLogId: string | null = null;
    let bufferLogId: string | null = null;

    // ── Telegram path ──────────────────────────────────────────────
    if (telegramResult && telegramResult.ok) {
      telegramLogId = crypto.randomUUID();
      const chatId = process.env.TELEGRAM_FREE_CHAT_ID;
      if (chatId) {
        const tg = await sendTelegramMessage(chatId, telegramResult.message, { parseMode: "none" }).catch((err) => {
          console.error("[commentary] Telegram threw:", err);
          return { ok: false, error: String(err) };
        });
        telegramSent = tg.ok;
        if (!tg.ok) console.error("[commentary] Telegram failed:", tg.error);
      }

      // Log Telegram row (with channel='telegram')
      await db.insert(commentaryLog).values({
        id: telegramLogId,
        gameId: pick.game.gameId,
        sport: pick.game.sport,
        message: telegramResult.message,
        postedAt: Math.floor(Date.now() / 1000),
        gameState: gameStateJson,
        category: pick.category,
        bucket: telegramResult.bucket,
        language: telegramResult.language,
        channel: "telegram",
      });
    }

    // ── Buffer path ────────────────────────────────────────────────
    if (bufferResult && bufferResult.ok) {
      bufferLogId = crypto.randomUUID();
      try {
        const buf = await postLiveToBuffer(bufferResult.message, { referenceId: bufferLogId });
        bufferSent = buf.ok;
        for (const ch of buf.channels || []) {
          if (!ch.success && ch.key) {
            bufferFailedChannels.push(ch.key);
            enqueueCommentaryRetry({
              originalLogId: bufferLogId,
              failedChannel: ch.key,
              messageText: bufferResult.message,
              lastError: ch.error ?? null,
            }).catch((err) => console.error("[commentary] enqueue retry failed:", err));
          }
        }
        if (!buf.ok) {
          console.error(`[commentary] Buffer FAILED (${pick.category}): ${buf.error}`);
        } else if (bufferFailedChannels.length > 0) {
          console.warn(`[commentary] Buffer partial failure: ${bufferFailedChannels.join(", ")}`);
        } else {
          console.log(`[commentary] Buffer sent to Twitter/Threads`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[commentary] Buffer threw:", err);
        if (!(err instanceof BufferConfigError)) {
          sendAdminNotification(
            `⚠️ Live commentary Buffer post failed\nCategory: ${pick.category}\nGame: ${pick.game.team1} vs ${pick.game.team2}\nError: ${errMsg}`
          ).catch(() => {});
        }
      }

      // Log Buffer row (with channel='buffer')
      await db.insert(commentaryLog).values({
        id: bufferLogId,
        gameId: pick.game.gameId,
        sport: pick.game.sport,
        message: bufferResult.message,
        postedAt: Math.floor(Date.now() / 1000),
        gameState: gameStateJson,
        category: pick.category,
        bucket: bufferResult.bucket,
        language: bufferResult.language,
        channel: "buffer",
      });
    }

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
      channels: {
        telegram: telegramSent,
        telegramRoutedTo: routing.telegram,
        telegramLanguage: telegramResult?.ok ? telegramResult.language : null,
        telegramMessage: telegramResult?.ok ? telegramResult.message : null,
        buffer: bufferSent,
        bufferRoutedTo: routing.buffer,
        bufferMessage: bufferResult?.ok ? bufferResult.message : null,
        bufferFailedChannels,
        bufferTokenSet: !!(process.env.BUFFER_LIVE_TOKEN || process.env.BUFFER_ACCESS_TOKEN),
      },
      candidatesConsidered: candidates.length,
    });
  } catch (error) {
    console.error("[commentary] Cron error:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
