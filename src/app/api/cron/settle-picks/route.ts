import { NextResponse } from "next/server";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";
import { evaluatePick } from "@/lib/pick-settler";
import { teamsMatch } from "@/lib/team-normalizer";
import type { ESPNGame } from "@/lib/espn";
import { refreshPerformanceCache } from "@/lib/refresh-performance";
import { sendAdminNotification, sendTelegramMessage } from "@/lib/telegram";
import { formatWinCelebrationMessage } from "@/lib/telegram-templates";
import { postToBuffer } from "@/lib/buffer";
import { queueVictoryPost } from "@/lib/victory-post-pipeline";

const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";

function sendTelegramPlain(text: string) {
  if (!TELEGRAM_FREE_CHAT_ID) return Promise.resolve({ ok: false, error: "Not configured" });
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, text, { parseMode: "none" });
}

type SettlementLog = {
  pickId: string;
  sport: string;
  matchup: string;
  pickText: string;
  gameFound: boolean;
  gameId?: string;
  score?: string;
  result?: string;
  confidence?: string;
  reason?: string;
  autoSettled: boolean;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (cronSecret.length < 16) {
    console.error("CRON_SECRET is too short (minimum 16 characters)");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: SettlementLog[] = [];

  try {
    // 1. Get all published picks with no result
    const unsettledPicks = await db
      .select()
      .from(picks)
      .where(and(eq(picks.status, "published"), isNull(picks.result)));

    if (unsettledPicks.length === 0) {
      return NextResponse.json({ message: "No picks to settle", logs: [] });
    }

    // 2. Group picks by sport + date for efficient ESPN fetching
    const picksBySportDate = new Map<string, typeof unsettledPicks>();

    for (const pick of unsettledPicks) {
      // Determine game date from pick
      const gameDate = pick.gameDate || pick.publishedAt?.split("T")[0] || pick.createdAt?.split("T")[0];
      if (!gameDate) continue;

      const espnDate = gameDate.replace(/-/g, "");
      const key = `${pick.sport}|${espnDate}`;

      if (!picksBySportDate.has(key)) {
        picksBySportDate.set(key, []);
      }
      picksBySportDate.get(key)!.push(pick);
    }

    // 3. Fetch scores and evaluate each pick
    const scoreboardCache = new Map<string, ESPNGame[]>();

    for (const [key, sportPicks] of picksBySportDate) {
      const [sport, date] = key.split("|");

      // Fetch scoreboard (cached per sport+date)
      if (!scoreboardCache.has(key)) {
        try {
          const games = await fetchScoreboard(sport, date);
          scoreboardCache.set(key, games);
        } catch (espnError) {
          console.error(`ESPN API failure for ${sport} on ${date}:`, espnError);
          sendAdminNotification(
            `⚠️ *ESPN API FAILURE*\n\n` +
            `Sport: ${sport}\n` +
            `Date: ${date}\n` +
            `Error: ${espnError instanceof Error ? espnError.message : "Unknown error"}\n` +
            `Affected picks: ${sportPicks.length}\n\n` +
            `These picks were skipped and will retry next cron run.`
          ).catch(() => {});
          continue;
        }
      }

      const games = scoreboardCache.get(key) || [];

      for (const pick of sportPicks) {
        const log: SettlementLog = {
          pickId: pick.id,
          sport: pick.sport,
          matchup: pick.matchup,
          pickText: pick.pickText,
          gameFound: false,
          autoSettled: false,
        };

        // 4. Match pick to ESPN game
        const game = findMatchingGame(pick.matchup, games, pick.sport);

        if (!game) {
          log.reason = "No matching game found on ESPN scoreboard";
          logs.push(log);
          continue;
        }

        log.gameFound = true;
        log.gameId = game.id;
        log.score = `${game.awayTeam} ${game.awayScore} - ${game.homeTeam} ${game.homeScore}`;

        if (game.status !== "post") {
          log.reason = `Game not final: ${game.statusDetail}`;
          logs.push(log);
          continue;
        }

        // 5. Evaluate the pick
        const settlement = evaluatePick({
          pickText: pick.pickText,
          sport: pick.sport,
          game,
        });

        log.result = settlement.result;
        log.confidence = settlement.confidence;
        log.reason = settlement.reason;

        // 6. Auto-settle if high confidence win/loss/push
        if (
          settlement.confidence === "high" &&
          (settlement.result === "win" || settlement.result === "loss" || settlement.result === "push")
        ) {
          await db
            .update(picks)
            .set({
              result: settlement.result,
              status: "settled",
              settledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(picks.id, pick.id));

          log.autoSettled = true;

          // Post win celebration to Telegram + Buffer (fire-and-forget)
          // Generate message once so both platforms get the same text
          if (settlement.result === "win") {
            const message = formatWinCelebrationMessage({
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
            });

            sendTelegramPlain(message).catch((err) =>
              console.error("[settle-picks] Win celebration failed:", err)
            );

            postToBuffer(message).catch((err) =>
              console.error("[settle-picks] Buffer win celebration failed:", err)
            );

            // Queue victory post for generation (fast DB write, no API calls)
            queueVictoryPost({
              id: pick.id,
              sport: pick.sport,
              matchup: pick.matchup,
              pickText: pick.pickText,
              odds: pick.odds,
              units: pick.units,
              tier: (pick.tier as "free" | "vip") || "free",
              team1Score: game.awayScore,
              team2Score: game.homeScore,
            }).catch((err) =>
              console.error("[settle-picks] Victory post queue failed:", err)
            );
          }
        }

        logs.push(log);
      }
    }

    // Summary
    const settled = logs.filter((l) => l.autoSettled).length;
    const manualReview = logs.filter((l) => l.result === "manual_review").length;
    const pending = logs.filter((l) => !l.gameFound || l.result === "pending").length;

    // Refresh performance cache if any picks were settled
    if (settled > 0) {
      await refreshPerformanceCache();
    }

    return NextResponse.json({
      message: `Processed ${logs.length} picks: ${settled} auto-settled, ${manualReview} manual review, ${pending} pending`,
      settled,
      manualReview,
      pending,
      total: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Cron settle-picks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Find the ESPN game that matches a pick's matchup string.
 * Matchup format is typically "Team A vs Team B" or "Team A @ Team B".
 */
function findMatchingGame(
  matchup: string,
  games: ESPNGame[],
  sport: string
): ESPNGame | undefined {
  // Parse matchup into two team names
  const parts = matchup.split(/\s+(?:vs\.?|@|at|v)\s+/i);

  if (parts.length < 2) {
    // Try to match any team name in the matchup against games
    for (const game of games) {
      if (
        teamsMatch(matchup, game.homeTeam, sport) ||
        teamsMatch(matchup, game.awayTeam, sport)
      ) {
        return game;
      }
    }
    return undefined;
  }

  const [team1, team2] = parts.map((p) => p.trim());

  for (const game of games) {
    const match1Home = teamsMatch(team1, game.homeTeam, sport);
    const match1Away = teamsMatch(team1, game.awayTeam, sport);
    const match2Home = teamsMatch(team2, game.homeTeam, sport);
    const match2Away = teamsMatch(team2, game.awayTeam, sport);

    if ((match1Home && match2Away) || (match1Away && match2Home)) {
      return game;
    }
  }

  // Fallback: try matching just one team
  for (const game of games) {
    if (
      teamsMatch(team1, game.homeTeam, sport) ||
      teamsMatch(team1, game.awayTeam, sport) ||
      teamsMatch(team2, game.homeTeam, sport) ||
      teamsMatch(team2, game.awayTeam, sport)
    ) {
      return game;
    }
  }

  return undefined;
}
