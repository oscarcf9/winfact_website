import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog, siteContent } from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { fetchAllLiveGames } from "@/lib/espn-live";
import { generateCommentary } from "@/lib/commentary-generator";
import { sendTelegramMessage } from "@/lib/telegram";
import { getSiteContent } from "@/db/queries/site-content";
import { postLiveToBuffer } from "@/lib/buffer";

// Defaults — overridden by siteContent settings if configured
const DEFAULT_COOLDOWN_MINUTES = 90;
const DEFAULT_WEEKDAY_START = 12;
const DEFAULT_WEEKDAY_END = 1; // 1 AM next day (wraps past midnight)
const DEFAULT_WEEKEND_START = 10;
const DEFAULT_WEEKEND_END = 1;

type CommentarySettings = {
  cooldownMinutes: number;
  weekdayStart: number;
  weekdayEnd: number;
  weekendStart: number;
  weekendEnd: number;
};

async function loadSettings(): Promise<CommentarySettings> {
  const keys = [
    "commentary_cooldown_minutes",
    "commentary_weekday_start_hour",
    "commentary_weekday_end_hour",
    "commentary_weekend_start_hour",
    "commentary_weekend_end_hour",
  ];
  const rows = await db
    .select()
    .from(siteContent)
    .where(inArray(siteContent.key, keys));

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    cooldownMinutes: parseInt(map.get("commentary_cooldown_minutes") || "") || DEFAULT_COOLDOWN_MINUTES,
    weekdayStart: parseInt(map.get("commentary_weekday_start_hour") || "") || DEFAULT_WEEKDAY_START,
    weekdayEnd: parseInt(map.get("commentary_weekday_end_hour") || "") || DEFAULT_WEEKDAY_END,
    weekendStart: parseInt(map.get("commentary_weekend_start_hour") || "") || DEFAULT_WEEKEND_START,
    weekendEnd: parseInt(map.get("commentary_weekend_end_hour") || "") || DEFAULT_WEEKEND_END,
  };
}

function isGameTime(settings: CommentarySettings): boolean {
  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    })
  );

  const etDay = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
  const isWeekend = etDay === "Sat" || etDay === "Sun";

  const start = isWeekend ? settings.weekendStart : settings.weekdayStart;
  const end = isWeekend ? settings.weekendEnd : settings.weekdayEnd;

  // Handle wrap-around (e.g. start=12, end=1 means 12pm to 1am next day)
  if (end < start) {
    return etHour >= start || etHour <= end;
  }
  return etHour >= start && etHour <= end;
}

async function hasRecentComment(gameId: string, cooldownMinutes: number): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - cooldownMinutes * 60;

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

  // Load configurable settings
  const settings = await loadSettings();

  // Time check
  if (!isGameTime(settings)) {
    return NextResponse.json({ status: "skipped", reason: "outside_game_hours" });
  }

  try {
    // Dual-frequency posting:
    // - Buffer (Twitter/Threads): ~50% skip = post every ~30 min
    // - Telegram: ~75% skip = post every ~1 hour
    const roll = Math.random();
    const skipBuffer = roll < 0.50;   // 50% skip = ~1 post per 30 min
    const skipTelegram = roll < 0.75; // 75% skip = ~1 post per hour

    // If both channels would be skipped, skip entirely
    if (skipBuffer && skipTelegram) {
      return NextResponse.json({ status: "skipped", reason: "random_delay" });
    }

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
      const recent = await hasRecentComment(game.gameId, settings.cooldownMinutes);
      if (!recent) {
        selectedGame = game;
        break;
      }
    }

    if (!selectedGame) {
      return NextResponse.json({ status: "skipped", reason: "all_games_on_cooldown" });
    }

    // 4. Fetch recent commentary for dedup + follow-up context
    const recentMessages = await db
      .select({ message: commentaryLog.message })
      .from(commentaryLog)
      .orderBy(desc(commentaryLog.postedAt))
      .limit(5);
    const recentCommentary = recentMessages.map((r) => r.message);

    // 4b. Check if we've commented on THIS game before (for follow-up)
    const priorOnGame = await db
      .select({ message: commentaryLog.message, gameState: commentaryLog.gameState })
      .from(commentaryLog)
      .where(eq(commentaryLog.gameId, selectedGame.gameId))
      .orderBy(desc(commentaryLog.postedAt))
      .limit(1);

    let followUpContext = "";
    if (priorOnGame.length > 0) {
      const prior = priorOnGame[0];
      const priorState = prior.gameState ? JSON.parse(prior.gameState) : null;
      followUpContext = `\nYou already commented on this game earlier when the score was ${priorState?.score || "unknown"}. Your previous comment: "${prior.message}"\nNow the score has changed. Give a FOLLOW-UP take. Reference how the game has shifted since your last comment. Did the team you mentioned come back? Did the lead grow? React to the change.\n`;
    }

    // 5. Generate commentary
    const comment = await generateCommentary(selectedGame, recentCommentary, followUpContext);

    if (!comment) {
      return NextResponse.json({ status: "error", reason: "commentary_generation_failed" });
    }

    let telegramSent = false;
    let bufferSent = false;

    // 6. Post to Telegram (~1 per hour)
    if (!skipTelegram) {
      const chatId = process.env.TELEGRAM_FREE_CHAT_ID;
      if (chatId) {
        const result = await sendTelegramMessage(chatId, comment, { parseMode: "none" });
        telegramSent = result.ok;
        if (!result.ok) console.error("[commentary] Telegram failed:", result.error);
      }
    }

    // 7. Cross-post to Twitter/Threads via Buffer (~1 per 30 min)
    if (!skipBuffer) {
      const bufferResult = await postLiveToBuffer(comment).catch((err) => {
        console.error("[commentary] Buffer error:", err);
        return { ok: false, error: String(err) } as const;
      });
      bufferSent = bufferResult.ok;
      console.log(`[commentary] Buffer: ${bufferResult.ok ? "sent" : `failed: ${bufferResult.error}`}`);
    }

    // 8. Log the commentary
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

    // Cleanup: delete logs older than 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    await db
      .delete(commentaryLog)
      .where(lte(commentaryLog.postedAt, sevenDaysAgo))
      .catch((err) => console.error("[commentary] Cleanup failed:", err));

    return NextResponse.json({
      status: "posted",
      game: `${selectedGame.team1} vs ${selectedGame.team2}`,
      sport: selectedGame.sport,
      channels: { telegram: telegramSent, buffer: bufferSent },
      comment,
    });
  } catch (error) {
    console.error("[commentary] Cron error:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
