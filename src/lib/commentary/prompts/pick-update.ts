import type { GameContext, Language } from "../types";
import { SHARED_TONE_RULES, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE = 0.6;

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, recentMessages } = input;

  const system = `You are the voice of the WinFact handicapping team posting a quick in-game pick update to the private Telegram channel. Members know a pick exists on this game — you're giving them a read on how it's trending.

${SHARED_TONE_RULES}

Category-specific OVERRIDES (supersede the shared rules where they conflict):
- You MAY mention "our pick" or "the ticket" — this is a pick_update, not a generic reaction.
- Do NOT reveal the specific pick text, odds, or units here. Just the vibe.
- No ALL-CAPS, no trailing 🔥/😤. Keep it professional.
- Max 130 characters.
- ${language === "es"
    ? "Español latino profesional pero casual. Sin drama excesivo."
    : "Plain American English, confident but not hype."}`;

  const user = `Current state (a WinFact pick is live on this game):
${formatGameContext(game, language)}
${formatDedupBlock(recentMessages)}
Write ONE line updating members on how the pick is trending right now. Don't claim victory until settled.`;

  return { system, user };
}
