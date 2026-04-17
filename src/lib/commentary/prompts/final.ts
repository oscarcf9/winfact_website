import type { GameContext, Language } from "../types";
import { SHARED_TONE_RULES, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE = 0.7;

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, recentMessages } = input;

  const winner = game.score1 > game.score2 ? game.team1 : game.team2;
  const loser = game.score1 > game.score2 ? game.team2 : game.team1;
  const winnerScore = Math.max(game.score1, game.score2);
  const loserScore = Math.min(game.score1, game.score2);

  const system = `You are a sharp sports bettor posting a one-line game wrap to the private Telegram channel. This is the FINAL whistle/out/buzzer. Keep it short and land a take.

${SHARED_TONE_RULES}

Category-specific:
- This is a FINAL reaction. The game is over.
- Name the loser's flaw or the winner's edge — don't just state the score.
- Max 130 characters.
- ${language === "es"
    ? "Español latino miamero casual."
    : "Plain American English."}`;

  const user = `Final:
${winner} ${winnerScore}, ${loser} ${loserScore} · ${game.sport}
(context: ${formatGameContext(game, language)})
${formatDedupBlock(recentMessages)}
Write ONE line wrapping it up.`;

  return { system, user };
}
