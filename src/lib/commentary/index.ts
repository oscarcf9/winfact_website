import Anthropic from "@anthropic-ai/sdk";
import type { LiveGame } from "@/lib/espn-live";
import type {
  GenerationInput,
  GenerationResult,
  Language,
  MessageCategory,
} from "./types";
import { bucketizeGameState } from "./types";
import { validateStyle } from "./style-guard";
import type { Channel } from "./style-guard";
import * as GameReactionPrompt from "./prompts/game-reaction";
import * as BigPlayPrompt from "./prompts/big-play";
import * as PickUpdatePrompt from "./prompts/pick-update";
import * as PreGamePrompt from "./prompts/pre-game";
import * as FinalPrompt from "./prompts/final";
import { getRecentMessagesForDedup } from "./dedup";
import { computeGameDelta, detectCategory, toGameContext } from "./detector";

export * from "./types";
export { validateStyle } from "./style-guard";
export type { Channel } from "./style-guard";
export { detectCategory, computeGameDelta, toGameContext, FREQ_CAP_SECONDS } from "./detector";
export { getRecentMessagesForDedup, getLastSnapshotForGame } from "./dedup";

/**
 * Routing rule: which channels each category should ship to.
 */
export const CATEGORY_CHANNELS: Record<MessageCategory, { telegram: boolean; buffer: boolean }> = {
  game_reaction: { telegram: true, buffer: true },
  big_play: { telegram: true, buffer: true },
  pick_update: { telegram: true, buffer: false }, // pick context stays in Telegram for members
  pre_game: { telegram: true, buffer: true },
  final: { telegram: true, buffer: true },
};

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 80;

// Sentinel returned by pick_update's buffer-channel branch (defensive only;
// the cron never calls pick_update on buffer because CATEGORY_CHANNELS blocks it).
const SKIP_SENTINEL = "__SKIP__";

async function callClaude(
  system: string,
  user: string,
  temperature: number
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  return cleanup(text);
}

function cleanup(raw: string): string {
  let out = raw
    .replace(/^["']|["']$/g, "")
    .replace(/^(Here'?s?|Sure|Okay|Got it|Message|Line)[^:]*:\s*/i, "")
    .replace(/#\w+/g, "")
    .replace(/\n/g, " ")
    .trim();

  // Hard length cap at 220 chars (per-channel max; style-guard prompts use
  // channel-specific soft budgets).
  if (out.length > 220) {
    const truncated = out.substring(0, 220);
    const lastSpace = truncated.lastIndexOf(" ");
    out = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
  }
  return out;
}

/**
 * Build the category-specific, channel-specific prompt and resolve temperature.
 */
function promptFor(input: GenerationInput): { system: string; user: string; temperature: number } {
  const { category, channel } = input;
  switch (category) {
    case "game_reaction": {
      const p = GameReactionPrompt.buildPrompt({
        game: input.game,
        bucket: input.game.bucket,
        language: input.language,
        channel,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: GameReactionPrompt.TEMPERATURE[channel] };
    }
    case "big_play": {
      const p = BigPlayPrompt.buildPrompt({
        game: input.game,
        delta: input.delta || { scoreDelta: 0, leaderFlipped: false, periodAdvanced: false, snapshotAgeSeconds: 0 },
        language: input.language,
        channel,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: BigPlayPrompt.TEMPERATURE[channel] };
    }
    case "pick_update": {
      const p = PickUpdatePrompt.buildPrompt({
        game: input.game,
        language: input.language,
        channel,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: PickUpdatePrompt.TEMPERATURE[channel] };
    }
    case "pre_game": {
      const p = PreGamePrompt.buildPrompt({
        game: input.game,
        language: input.language,
        channel,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: PreGamePrompt.TEMPERATURE[channel] };
    }
    case "final": {
      const p = FinalPrompt.buildPrompt({
        game: input.game,
        language: input.language,
        channel,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: FinalPrompt.TEMPERATURE[channel] };
    }
  }
}

/**
 * Generate a commentary message for a specific (category, channel) pair.
 *
 * Dedup is fetched per channel — Telegram's Miami voice and Buffer's
 * professional voice each see their own recent messages.
 *
 * Style-guard rules come from the channel's config (Telegram permissive,
 * Buffer strict). One retry on style failure; skip tick if second attempt
 * also fails.
 */
export async function generateMessage(
  input: Omit<GenerationInput, "recentMessages">
): Promise<GenerationResult> {
  const { language, channel, category } = input;

  // Defensive: pick_update routes Telegram-only. If a caller asks for buffer,
  // return a clean skip result immediately.
  if (category === "pick_update" && channel === "buffer") {
    return { ok: false, reason: "pick_update_not_on_buffer" };
  }

  // Fetch per-channel dedup context
  const recentMessages = await getRecentMessagesForDedup({
    category,
    sport: input.game.sport,
    bucket: category === "game_reaction" ? input.game.bucket : null,
    channel,
  });

  const attemptInput: GenerationInput = { ...input, recentMessages };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { system, user, temperature } = promptFor(attemptInput);

    let text = "";
    try {
      text = await callClaude(system, user, temperature);
    } catch (err) {
      console.error(`[commentary] Claude error (attempt ${attempt}, ${channel}):`, err);
      return { ok: false, reason: "claude_error" };
    }

    if (!text || text === SKIP_SENTINEL) {
      return { ok: false, reason: text === SKIP_SENTINEL ? "skip_sentinel" : "empty_response" };
    }

    const verdict = validateStyle(text, attemptInput.recentMessages, channel);
    if (verdict.ok) {
      return {
        ok: true,
        message: text,
        language,
        category,
        bucket: category === "game_reaction" ? input.game.bucket : null,
        channel,
      };
    }

    console.log(`[commentary] style-guard rejected attempt ${attempt} (${channel}): ${verdict.reason} | msg="${text}"`);

    // Add rejected text to dedup list so retry must produce different content
    attemptInput.recentMessages = [text, ...attemptInput.recentMessages].slice(0, 12);
  }

  return { ok: false, reason: "style_guard_rejected_twice" };
}

/**
 * Convenience: convert a LiveGame to a GameContext, then generate for one channel.
 */
export async function generateForLiveGame(
  game: LiveGame,
  opts: { category: MessageCategory; language: Language; channel: Channel }
): Promise<GenerationResult> {
  const ctx = toGameContext(game);
  if (opts.category === "big_play") {
    const delta = await computeGameDelta(game);
    return generateMessage({
      category: opts.category,
      game: ctx,
      delta,
      language: opts.language,
      channel: opts.channel,
    });
  }
  return generateMessage({
    category: opts.category,
    game: ctx,
    language: opts.language,
    channel: opts.channel,
  });
}

export { bucketizeGameState };
