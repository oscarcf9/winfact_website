import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
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
      comment,
    });
  } catch (error) {
    console.error("[commentary] Cron error:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
