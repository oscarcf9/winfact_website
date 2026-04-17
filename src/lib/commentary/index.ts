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
import * as GameReactionPrompt from "./prompts/game-reaction";
import * as BigPlayPrompt from "./prompts/big-play";
import * as PickUpdatePrompt from "./prompts/pick-update";
import * as PreGamePrompt from "./prompts/pre-game";
import * as FinalPrompt from "./prompts/final";
import { getRecentMessagesForDedup } from "./dedup";
import { computeGameDelta, detectCategory, toGameContext } from "./detector";

export * from "./types";
export { validateStyle } from "./style-guard";
export { detectCategory, computeGameDelta, toGameContext, FREQ_CAP_SECONDS } from "./detector";
export { getRecentMessagesForDedup, getLastSnapshotForGame } from "./dedup";

/**
 * Routing rule: which channels each category should ship to.
 * Actual distribution is the cron's responsibility; this is the declarative
 * truth the cron reads to decide.
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
const MAX_TOKENS = 60;

/**
 * Drive Claude with a category-specific prompt and return the raw text.
 */
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

/**
 * Strip wrapping quotes, hashtags, and common LLM preamble. Collapse to one line.
 */
function cleanup(raw: string): string {
  let out = raw
    .replace(/^["']|["']$/g, "")
    .replace(/^(Here'?s?|Sure|Okay|Got it|Message|Line)[^:]*:\s*/i, "")
    .replace(/#\w+/g, "")
    .replace(/\n/g, " ")
    .trim();

  // Hard length cap at 150 chars, truncated to a word boundary.
  if (out.length > 150) {
    const truncated = out.substring(0, 150);
    const lastSpace = truncated.lastIndexOf(" ");
    out = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
  }
  return out;
}

/**
 * Build the category-specific prompt and resolve temperature.
 */
function promptFor(input: GenerationInput): { system: string; user: string; temperature: number } {
  switch (input.category) {
    case "game_reaction": {
      const p = GameReactionPrompt.buildPrompt({
        game: input.game,
        bucket: input.game.bucket,
        language: input.language,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: GameReactionPrompt.TEMPERATURE };
    }
    case "big_play": {
      const p = BigPlayPrompt.buildPrompt({
        game: input.game,
        delta: input.delta || { scoreDelta: 0, leaderFlipped: false, periodAdvanced: false, snapshotAgeSeconds: 0 },
        language: input.language,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: BigPlayPrompt.TEMPERATURE };
    }
    case "pick_update": {
      const p = PickUpdatePrompt.buildPrompt({
        game: input.game,
        language: input.language,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: PickUpdatePrompt.TEMPERATURE };
    }
    case "pre_game": {
      const p = PreGamePrompt.buildPrompt({
        game: input.game,
        language: input.language,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: PreGamePrompt.TEMPERATURE };
    }
    case "final": {
      const p = FinalPrompt.buildPrompt({
        game: input.game,
        language: input.language,
        recentMessages: input.recentMessages,
      });
      return { ...p, temperature: FinalPrompt.TEMPERATURE };
    }
  }
}

/**
 * Public entry point. Builds the prompt for the selected category, calls
 * Claude, runs style-guard, retries ONCE on style failure (with the rejected
 * text added to the dedup context), and returns the final message.
 *
 * If the second attempt also fails, returns ok: false — callers SKIP the
 * tick rather than ship sloppy content.
 */
export async function generateMessage(
  input: Omit<GenerationInput, "recentMessages">
): Promise<GenerationResult> {
  const language: Language = input.language;

  // Fetch dedup context tailored to the category
  const recentMessages = await getRecentMessagesForDedup({
    category: input.category,
    sport: input.game.sport,
    bucket: input.category === "game_reaction" ? input.game.bucket : null,
  });

  const attemptInput: GenerationInput = { ...input, recentMessages };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { system, user, temperature } = promptFor(attemptInput);

    let text = "";
    try {
      text = await callClaude(system, user, temperature);
    } catch (err) {
      console.error(`[commentary] Claude error (attempt ${attempt}):`, err);
      return { ok: false, reason: "claude_error" };
    }

    if (!text) {
      return { ok: false, reason: "empty_response" };
    }

    const verdict = validateStyle(text, attemptInput.recentMessages);
    if (verdict.ok) {
      return {
        ok: true,
        message: text,
        language,
        category: input.category,
        bucket: input.category === "game_reaction" ? input.game.bucket : null,
      };
    }

    console.log(`[commentary] style-guard rejected attempt ${attempt}: ${verdict.reason} | msg="${text}"`);

    // Add the rejected text to the dedup list so the retry has to actually
    // produce something different (not just different style).
    attemptInput.recentMessages = [text, ...attemptInput.recentMessages].slice(0, 12);
  }

  return { ok: false, reason: "style_guard_rejected_twice" };
}

/**
 * Convenience: convert a LiveGame to a GameContext, then generate.
 * Prefer calling generateMessage directly from the cron so the cron owns
 * category detection and frequency-cap enforcement.
 */
export async function generateForLiveGame(
  game: LiveGame,
  opts: { category: MessageCategory; language: Language }
): Promise<GenerationResult> {
  const ctx = toGameContext(game);
  if (opts.category === "big_play") {
    const delta = await computeGameDelta(game);
    return generateMessage({ category: opts.category, game: ctx, delta, language: opts.language });
  }
  return generateMessage({ category: opts.category, game: ctx, language: opts.language });
}

export { bucketizeGameState };
