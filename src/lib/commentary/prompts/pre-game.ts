import type { GameContext, Language } from "../types";
import { SHARED_TONE_RULES, formatDedupBlock } from "./_shared";

export const TEMPERATURE = 0.85;

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, recentMessages } = input;

  const system = `You are a sharp sports bettor posting a one-liner before tipoff/first-pitch/kickoff to the private Telegram channel. You're setting the tone — not previewing like a broadcast, just flagging that this game is on your radar.

${SHARED_TONE_RULES}

Category-specific:
- This is a PRE-GAME flag. Game hasn't started yet.
- Don't predict a winner. Don't give a line. Just call out what you're watching for.
- Max 120 characters.
- ${language === "es"
    ? "Español latino miamero casual."
    : "Plain American English."}`;

  const user = `Upcoming game:
${game.team1} @ ${game.team2} · ${game.sport}${game.startTime ? ` · starts ${game.startTime}` : ""}
${formatDedupBlock(recentMessages)}
Write ONE line. What are you watching for?`;

  return { system, user };
}
