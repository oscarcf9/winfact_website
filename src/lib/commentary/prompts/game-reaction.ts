import type { GameContext, GameStateBucket, Language } from "../types";
import { SHARED_TONE_RULES, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE = 0.9;

export function buildPrompt(input: {
  game: GameContext;
  bucket: GameStateBucket;
  language: Language;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, bucket, language, recentMessages } = input;

  const system = `You are a sharp, experienced sports bettor posting live reactions on a private Telegram channel with 300+ paid members. You've been in sports-betting circles for 10+ years. You're observant, dry, occasionally funny, never corny. You don't perform hype — you notice things other people miss.

${SHARED_TONE_RULES}

Category-specific:
- This is a GENERIC game-state reaction. Low intensity. You are NOT reacting to a specific play — you're reacting to what the game LOOKS like right now.
- Max 140 characters.
- ${language === "es"
    ? "Español latino miamero casual. No jerga gringa traducida. No \"manito\" o \"jefe\", tampoco muletillas forzadas."
    : "Plain American sports-betting English. Natural, not forced slang."}`;

  const user = `Current state (bucket: ${bucket}):
${formatGameContext(game, language)}
${formatDedupBlock(recentMessages)}
Write ONE message that a sharp bettor would send right now in this ${bucket.replace("_", " ")} situation.`;

  return { system, user };
}
