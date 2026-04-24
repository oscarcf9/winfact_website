import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { commentaryLog, siteContent } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { fetchAllLiveGames } from "@/lib/espn-live";
import { sendTelegramMessage } from "@/lib/telegram";
import { postLiveToBuffer, BufferConfigError } from "@/lib/buffer";
import {
  toGameContext,
  computeGameDelta,
  detectCategory,
  generateMessage,
  CATEGORY_CHANNELS,
  type Language,
  type MessageCategory,
} from "@/lib/commentary";

/**
 * Admin-only: fires the live-commentary pipeline once, RIGHT NOW, bypassing
 * the isGameTime() window + cron auth check. Dry-run mode is supported.
 *
 * POST /api/admin/content/run-now?job=commentary[&dry=1]
 *
 * Returns the raw outcome (which game got picked, what category, what
 * Telegram/Buffer actually posted) so we can see exactly why a production
 * tick returned "skipped" or "no_eligible_games".
 *
 * Dry mode skips real posting but runs Claude generation.
 */
async function handle(req: Request): Promise<Response> {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const url = new URL(req.url);
  const job = url.searchParams.get("job") || "commentary";
  const dry = url.searchParams.get("dry") === "1";

  if (job === "commentary") {
    return runCommentary(dry);
  }

  if (job === "filler") {
    return runFiller(req);
  }

  return NextResponse.json({ error: `Unknown job: ${job}. Valid: commentary, filler` }, { status: 400 });
}

// Accept both GET and POST so the admin can hit the endpoint from the browser
// URL bar without needing to craft a POST. Both forms behave identically.
export const GET = handle;
export const POST = handle;

/**
 * Trigger the filler-content cron by making an internal fetch with the
 * CRON_SECRET. Returns immediately — the filler cron can take 60-180s to
 * generate N images in parallel, which exceeds most proxy timeouts.
 *
 * Use /distribution-diagnostics 60-120s later to see the resulting queue rows.
 */
async function runFiller(originalReq: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const origin = new URL(originalReq.url).origin;
  const fillerUrl = `${origin}/api/cron/filler-content`;

  // Fire-and-forget. We don't await the response so this endpoint returns
  // immediately; the filler cron continues running on Vercel until it
  // finishes or hits maxDuration.
  fetch(fillerUrl, {
    headers: { Authorization: `Bearer ${secret}` },
  })
    .then((res) => console.log(`[run-now/filler] cron finished: ${res.status}`))
    .catch((err) => console.error("[run-now/filler] cron fetch failed:", err));

  return NextResponse.json({
    job: "filler",
    ok: true,
    dispatched: true,
    hint:
      "Filler cron fired in background. It takes 60-180s to generate images + captions. " +
      "Wait ~2 min, then query /api/admin/content/distribution-diagnostics to see " +
      "new filler rows under recentQueue, and (after process-content-queue picks them up) " +
      "new filler entries in channelSummary.",
  });
}

const PRIORITY: Record<MessageCategory, number> = {
  big_play: 5,
  final: 4,
  pick_update: 3,
  pre_game: 2,
  game_reaction: 1,
};

async function runCommentary(dry: boolean) {
  // Feature-gate check (informational only — we still run)
  const toggleRow = await db.select().from(siteContent).where(inArray(siteContent.key, ["live_commentary_enabled"])).limit(1);
  const toggleValue = toggleRow[0]?.value ?? null;

  // 1. Fetch live games
  const liveGames = await fetchAllLiveGames().catch((err) => {
    return { __error: err instanceof Error ? err.message : String(err) } as const;
  });

  if ("__error" in liveGames) {
    return NextResponse.json({
      status: "error",
      stage: "fetch_live_games",
      error: liveGames.__error,
      toggle: toggleValue,
    });
  }

  if (liveGames.length === 0) {
    return NextResponse.json({
      status: "skipped",
      reason: "no_live_games",
      toggle: toggleValue,
      hint: "No games currently live on ESPN for any tracked sport. Try again during active game hours (7-11 PM ET most nights).",
    });
  }

  // 2. Detect category per game
  type Candidate = {
    game: typeof liveGames[number];
    category: MessageCategory;
    delta: Awaited<ReturnType<typeof computeGameDelta>>;
    reason: string;
  };
  const candidates: Candidate[] = [];
  const skipped: { game: string; reason: string }[] = [];
  for (const g of liveGames) {
    const delta = await computeGameDelta(g);
    const det = await detectCategory(g, delta);
    if (det.category) {
      candidates.push({ game: g, category: det.category, delta, reason: det.reason });
    } else {
      skipped.push({ game: `${g.team1} vs ${g.team2} (${g.sport})`, reason: det.reason });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      status: "skipped",
      reason: "no_eligible_games",
      toggle: toggleValue,
      liveGameCount: liveGames.length,
      skippedGames: skipped,
      hint: "All live games have hit their frequency cap (game_reaction: 1 per 20min; big_play: 1 per 3min; pre_game/final: once per game). Wait for a score change, period change, or new game.",
    });
  }

  // 3. Pick top candidate
  candidates.sort((a, b) => {
    const diff = PRIORITY[b.category] - PRIORITY[a.category];
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });
  const pick = candidates[0];
  const ctx = toGameContext(pick.game);
  const routing = CATEGORY_CHANNELS[pick.category];

  // 4. Generate per-channel
  const telegramLanguage: Language = Math.random() < 0.9 ? "es" : "en";
  const bufferLanguage: Language = Math.random() < 0.2 ? "es" : "en";

  type GenArgs = Parameters<typeof generateMessage>[0];
  const baseArgs = (channel: "telegram" | "buffer"): GenArgs => {
    const args: GenArgs = {
      category: pick.category,
      game: ctx,
      language: channel === "telegram" ? telegramLanguage : bufferLanguage,
      channel,
    };
    if (pick.category === "big_play") args.delta = pick.delta;
    return args;
  };

  const [telegramResult, bufferResult] = await Promise.all([
    routing.telegram ? generateMessage(baseArgs("telegram")) : Promise.resolve(null),
    routing.buffer ? generateMessage(baseArgs("buffer")) : Promise.resolve(null),
  ]);

  // 5. Post if not dry
  let telegramPosted: { ok: boolean; error?: string } | null = null;
  let bufferPosted: { ok: boolean; error?: string; channels?: unknown } | null = null;

  if (!dry) {
    if (telegramResult && telegramResult.ok) {
      const chatId = process.env.TELEGRAM_FREE_CHAT_ID;
      if (chatId) {
        const r = await sendTelegramMessage(chatId, telegramResult.message, { parseMode: "none" }).catch((err) => ({
          ok: false,
          error: String(err),
        }));
        telegramPosted = r;
      } else {
        telegramPosted = { ok: false, error: "TELEGRAM_FREE_CHAT_ID not set" };
      }

      await db.insert(commentaryLog).values({
        id: crypto.randomUUID(),
        gameId: pick.game.gameId,
        sport: pick.game.sport,
        message: telegramResult.message,
        postedAt: Math.floor(Date.now() / 1000),
        gameState: JSON.stringify({ score: `${pick.game.score1}-${pick.game.score2}`, period: pick.game.period, clock: pick.game.clock }),
        category: pick.category,
        bucket: telegramResult.bucket,
        language: telegramResult.language,
        channel: "telegram",
      }).catch((err) => console.error("[run-now] commentaryLog telegram insert failed:", err));
    }

    if (bufferResult && bufferResult.ok) {
      try {
        const buf = await postLiveToBuffer(bufferResult.message);
        bufferPosted = { ok: buf.ok, error: buf.error, channels: buf.channels };
      } catch (err) {
        if (err instanceof BufferConfigError) {
          bufferPosted = { ok: false, error: `BufferConfigError: ${err.message}` };
        } else {
          bufferPosted = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }

      await db.insert(commentaryLog).values({
        id: crypto.randomUUID(),
        gameId: pick.game.gameId,
        sport: pick.game.sport,
        message: bufferResult.message,
        postedAt: Math.floor(Date.now() / 1000),
        gameState: JSON.stringify({ score: `${pick.game.score1}-${pick.game.score2}`, period: pick.game.period, clock: pick.game.clock }),
        category: pick.category,
        bucket: bufferResult.bucket,
        language: bufferResult.language,
        channel: "buffer",
      }).catch((err) => console.error("[run-now] commentaryLog buffer insert failed:", err));
    }
  }

  return NextResponse.json({
    status: dry ? "dry-run" : "posted",
    toggle: toggleValue,
    pickedGame: `${pick.game.team1} vs ${pick.game.team2}`,
    pickedSport: pick.game.sport,
    category: pick.category,
    categoryReason: pick.reason,
    candidatesConsidered: candidates.length,
    skippedGames: skipped,
    generation: {
      telegram: telegramResult
        ? telegramResult.ok
          ? { ok: true, message: telegramResult.message, language: telegramResult.language }
          : { ok: false, reason: telegramResult.reason }
        : { ok: false, reason: "routing_disabled" },
      buffer: bufferResult
        ? bufferResult.ok
          ? { ok: true, message: bufferResult.message, language: bufferResult.language }
          : { ok: false, reason: bufferResult.reason }
        : { ok: false, reason: "routing_disabled" },
    },
    posted: dry
      ? null
      : {
          telegram: telegramPosted,
          buffer: bufferPosted,
        },
  });
}
