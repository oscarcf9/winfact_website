import type { GameContext, Language, GameDelta } from "../types";
import { SHARED_TONE_RULES, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE = 0.8;

export function buildPrompt(input: {
  game: GameContext;
  delta: GameDelta;
  language: Language;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, delta, language, recentMessages } = input;

  const system = `You are a sharp, experienced sports bettor posting live reactions on a private Telegram channel with 300+ paid members. Something meaningful just happened in this game — react to it.

${SHARED_TONE_RULES}

Category-specific:
- This is a BIG PLAY / MOMENTUM SHIFT reaction. The score just changed significantly (${delta.scoreDelta} point/run swing${delta.leaderFlipped ? ", lead CHANGED" : ""}).
- Don't narrate the play — you don't know the exact play. React to the SHIFT.
- Max 120 characters. Shorter is sharper here.
- ${language === "es"
    ? "Español latino miamero natural. Sin mimetizar inglés."
    : "Plain American sports-betting English."}`;

  const changeNote = delta.leaderFlipped
    ? `Lead just flipped — ${game.team1} and ${game.team2} traded places.`
    : `Score just swung by ${delta.scoreDelta}.`;

  const user = `Current state:
${formatGameContext(game, language)}

${changeNote}
${formatDedupBlock(recentMessages)}
React to the shift. ONE message.`;

  return { system, user };
}
