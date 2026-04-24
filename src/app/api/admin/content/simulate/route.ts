import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import Anthropic from "@anthropic-ai/sdk";
import { generateMessage, toGameContext, CATEGORY_CHANNELS, type Language, type MessageCategory } from "@/lib/commentary";
import type { LiveGame } from "@/lib/espn-live";

/**
 * Admin-only simulation endpoint.
 *
 * GET  /api/admin/content/simulate?scenario=nba_close|mlb_tied|nfl_blowout|pregame
 *      Returns Claude-generated examples of what WILL post for the scenario:
 *      - Telegram free group (Miami community voice)
 *      - X / Threads via Buffer (sharp-bettor voice)
 *      - Filler matchup caption (bilingual)
 *
 * Does NOT actually post anywhere. Purely a preview harness so the admin can
 * see concrete output before turning toggles on.
 *
 * Also runs in dry-run mode if ?dry=1 is passed — returns the template/stub
 * output without calling Claude (free / instant).
 */

const SCENARIOS: Record<string, Partial<LiveGame>> = {
  nba_close: {
    gameId: "sim-nba-close",
    sport: "NBA",
    league: "NBA",
    team1: "Heat",
    team2: "Celtics",
    score1: 78,
    score2: 84,
    period: 3,
    clock: "4:32",
    status: "in",
    situation: "Celtics up 6 in the 3rd, Tatum with 4 fouls on the bench",
  },
  mlb_tied: {
    gameId: "sim-mlb-tied",
    sport: "MLB",
    league: "MLB",
    team1: "Dodgers",
    team2: "Padres",
    score1: 3,
    score2: 3,
    period: 7,
    clock: "",
    status: "in",
    situation: "Tied 3-3 going to the bottom of the 7th",
  },
  nfl_blowout: {
    gameId: "sim-nfl-blow",
    sport: "NFL",
    league: "NFL",
    team1: "Chiefs",
    team2: "Raiders",
    score1: 28,
    score2: 3,
    period: 3,
    clock: "8:12",
    status: "in",
    situation: "Chiefs up 25 in the 3rd, Raiders already benching starters",
  },
  pregame: {
    gameId: "sim-pre",
    sport: "NBA",
    league: "NBA",
    team1: "Lakers",
    team2: "Nuggets",
    score1: 0,
    score2: 0,
    period: 0,
    clock: "",
    status: "pre",
    situation: "Tip-off at 10 PM ET",
  },
};

function stubLiveGame(p: Partial<LiveGame>): LiveGame {
  return {
    gameId: p.gameId || "sim",
    sport: p.sport || "NBA",
    league: p.league || p.sport || "NBA",
    team1: p.team1 || "Team A",
    team2: p.team2 || "Team B",
    score1: p.score1 ?? 0,
    score2: p.score2 ?? 0,
    period: p.period ?? 1,
    clock: p.clock || "",
    status: (p.status as LiveGame["status"]) || "in",
    situation: p.situation || "",
    isInteresting: true,
  };
}

function pickCategory(game: LiveGame): MessageCategory {
  if (game.status === "pre") return "pre_game";
  if (game.status === "post") return "final";
  // For in-progress: default to game_reaction (big_play needs a delta; this is a preview)
  return "game_reaction";
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const url = new URL(req.url);
  const scenario = url.searchParams.get("scenario") || "nba_close";
  const dry = url.searchParams.get("dry") === "1";

  const blueprint = SCENARIOS[scenario];
  if (!blueprint) {
    return NextResponse.json(
      { error: "Unknown scenario", validScenarios: Object.keys(SCENARIOS) },
      { status: 400 }
    );
  }

  const liveGame = stubLiveGame(blueprint);
  const ctx = toGameContext(liveGame);
  const category = pickCategory(liveGame);
  const routing = CATEGORY_CHANNELS[category];

  // Language selection matches the cron: telegram 90% ES / 10% EN, buffer 80% EN / 20% ES.
  // For simulation, generate BOTH ES and EN on Telegram so the user sees the mix.
  const [telegramEs, telegramEn, bufferEn] = dry
    ? [
        { ok: true as const, message: dryStubTelegram(liveGame, "es"), reason: "dry" },
        { ok: true as const, message: dryStubTelegram(liveGame, "en"), reason: "dry" },
        { ok: true as const, message: dryStubBuffer(liveGame, "en"), reason: "dry" },
      ]
    : await Promise.all([
        routing.telegram
          ? generateMessage({ category, game: ctx, language: "es", channel: "telegram" })
              .catch((err) => ({ ok: false as const, reason: `threw: ${String(err)}` }))
          : Promise.resolve({ ok: false as const, reason: "routing_disabled" }),
        routing.telegram
          ? generateMessage({ category, game: ctx, language: "en", channel: "telegram" })
              .catch((err) => ({ ok: false as const, reason: `threw: ${String(err)}` }))
          : Promise.resolve({ ok: false as const, reason: "routing_disabled" }),
        routing.buffer
          ? generateMessage({ category, game: ctx, language: "en", channel: "buffer" })
              .catch((err) => ({ ok: false as const, reason: `threw: ${String(err)}` }))
          : Promise.resolve({ ok: false as const, reason: "routing_disabled" }),
      ]);

  const fillerCaption = dry ? dryStubFillerCaption(liveGame) : await generateFillerCaptionForSim(liveGame);

  return NextResponse.json({
    scenario,
    dry,
    game: {
      sport: liveGame.sport,
      matchup: `${liveGame.team1} vs ${liveGame.team2}`,
      score: `${liveGame.score1}-${liveGame.score2}`,
      period: liveGame.period,
      clock: liveGame.clock,
      status: liveGame.status,
      situation: liveGame.situation,
    },
    category,
    routing,
    outputs: {
      telegram_free_group: {
        channel: "Telegram free group (t.me/winfactpicks)",
        language_es: telegramEs && "message" in telegramEs ? telegramEs.message : null,
        language_en: telegramEn && "message" in telegramEn ? telegramEn.message : null,
        reason_es: telegramEs && !("message" in telegramEs) ? (telegramEs as { reason?: string }).reason : null,
        reason_en: telegramEn && !("message" in telegramEn) ? (telegramEn as { reason?: string }).reason : null,
      },
      x_and_threads: {
        channel: "X (@winfactpicks) + Threads (@winfact_picks) via Buffer",
        note: "Same text posts to both — Buffer text_only route",
        message: bufferEn && "message" in bufferEn ? bufferEn.message : null,
        reason: bufferEn && !("message" in bufferEn) ? (bufferEn as { reason?: string }).reason : null,
      },
      filler_matchup_graphic_caption: {
        channel: "Instagram + Facebook + X + Threads (with AI image)",
        note: "Caption for the matchup graphic — image is 1080x1440 portrait generated via OpenAI gpt-image-1",
        ...fillerCaption,
      },
    },
    envCheck: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      BUFFER_LIVE_TOKEN: !!process.env.BUFFER_LIVE_TOKEN,
      BUFFER_ACCESS_TOKEN: !!process.env.BUFFER_ACCESS_TOKEN,
      TELEGRAM_FREE_CHAT_ID: !!process.env.TELEGRAM_FREE_CHAT_ID,
      R2_CONFIGURED: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID),
    },
  });
}

// ── Dry-run stubs (no API calls) ─────────────────────────────────────────

function dryStubTelegram(g: LiveGame, lang: "es" | "en"): string {
  if (g.status === "pre") {
    return lang === "es"
      ? `🏀 Nos vemos esta noche familia, ${g.team1} vs ${g.team2}, vamossss 🔥`
      : `Tonight: ${g.team1} vs ${g.team2}. Let's eat, familia 🔥`;
  }
  const lead = g.score1 > g.score2 ? g.team1 : g.score2 > g.score1 ? g.team2 : null;
  const margin = Math.abs(g.score1 - g.score2);
  if (!lead) {
    return lang === "es"
      ? `Empatados ${g.score1}-${g.score2} en el ${g.sport === "MLB" ? g.period + "mo" : "Q" + g.period} 👀 esto se pone bueno`
      : `Tied ${g.score1}-${g.score2} in ${g.sport === "MLB" ? "the " + g.period + "th" : "Q" + g.period}, gonna come down to the wire`;
  }
  return lang === "es"
    ? `${lead.toUpperCase()} arriba ${margin} en el ${g.sport === "MLB" ? g.period + "mo" : "Q" + g.period} 💪 vamossss`
    : `${lead} up ${margin} going into ${g.sport === "MLB" ? "inning " + g.period : "Q" + g.period}, keep riding`;
}

function dryStubBuffer(g: LiveGame, _lang: "en"): string {
  if (g.status === "pre") {
    return `${g.team1} at ${g.team2} tonight. Playoff implications on both sides. Look for which lineup closes games.`;
  }
  const lead = g.score1 > g.score2 ? g.team1 : g.score2 > g.score1 ? g.team2 : null;
  if (!lead) {
    return `${g.team1} ${g.score1}, ${g.team2} ${g.score2} through ${g.period}${ord(g.period)}. Both bullpens warming, leverage arms likely next.`;
  }
  const margin = Math.abs(g.score1 - g.score2);
  return `${lead} ${margin} up on ${lead === g.team1 ? g.team2 : g.team1}, ${g.period}${ord(g.period)} quarter. Defensive rotations are the story; watch the bench stretch.`;
}

function ord(n: number): string {
  const v = n % 100;
  return ["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th";
}

function dryStubFillerCaption(g: LiveGame): { caption_en: string; caption_es: string; hashtags: string } {
  return {
    caption_en: `🏀 Tonight's showdown: ${g.team1} visit ${g.team2}. Tip-off 8:05 PM ET. Two contenders with something to prove.`,
    caption_es: `🏀 Duelo esta noche: ${g.team1} visita a ${g.team2}. Comienzo 8:05 PM ET. Dos equipos con algo que demostrar.`,
    hashtags: `#${g.sport} #${g.team1.replace(/\s/g, "")} #${g.team2.replace(/\s/g, "")} #WinFactPicks #GameDay`,
  };
}

// ── Real filler caption generation (mirrors the cron's generator) ────────

async function generateFillerCaptionForSim(
  g: LiveGame
): Promise<{ caption_en: string; caption_es: string; hashtags: string }> {
  const hashtags = `#${g.sport} #${g.team1.replace(/\s/g, "")} #${g.team2.replace(/\s/g, "")} #WinFactPicks #GameDay`;
  if (!process.env.ANTHROPIC_API_KEY) {
    return { caption_en: "[ANTHROPIC_API_KEY missing]", caption_es: "[ANTHROPIC_API_KEY faltante]", hashtags };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = (lang: "English" | "Spanish (Latin American, Miami vibe)") => `
Write a 2-3 sentence social media caption for a matchup graphic.
Game: ${g.team1} vs ${g.team2} (${g.sport})
Language: ${lang}
Tone: Hype but not cheesy. Community-driven. No hashtags (those are appended separately). Short.
Output ONLY the caption text.`.trim();

  try {
    const [en, es] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt("English") }],
      }),
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt("Spanish (Latin American, Miami vibe)") }],
      }),
    ]);
    return {
      caption_en: en.content[0]?.type === "text" ? en.content[0].text.trim() : "",
      caption_es: es.content[0]?.type === "text" ? es.content[0].text.trim() : "",
      hashtags,
    };
  } catch (err) {
    return {
      caption_en: `[Claude error: ${err instanceof Error ? err.message : String(err)}]`,
      caption_es: "",
      hashtags,
    };
  }
}
