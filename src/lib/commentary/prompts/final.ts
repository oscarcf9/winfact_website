import type { GameContext, Language } from "../types";
import type { Channel } from "../style-guard";
import { voiceGuidanceFor, lengthBudgetFor, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE: Record<Channel, number> = {
  telegram: 0.85,
  buffer: 0.65,
};

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  channel: Channel;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, channel, recentMessages } = input;

  const winner = game.score1 > game.score2 ? game.team1 : game.team2;
  const loser = game.score1 > game.score2 ? game.team2 : game.team1;
  const winnerScore = Math.max(game.score1, game.score2);
  const loserScore = Math.min(game.score1, game.score2);

  const categoryBlock = channel === "telegram"
    ? `
CATEGORY: final on Telegram — game's over, land a reaction with the group.

EXAMPLES OF GOOD Telegram final messages:
- "HEAT SE LO LLEVAN 112-110 🔥🔥 MI GENTE"
- "RAYS CAYERON 5-3 😤 mañana es otro día familia"
- "BARCA 2-1 ESO ES LO QUE QUERIAMOS PAPA 🔥"
- "TIGERS perdieron en extra innings, una lástima 😤"
- "VAMOSSSS HEAT 115-108"`
    : `
CATEGORY: final on X/Threads — professional game wrap.

EXAMPLES OF GOOD Buffer final messages:
- "Heat hold on 112-110 over Boston. Series 2-1."
- "Rays fall 5-3. Back-to-back losses for Tampa."
- "Barça 2-1 winner over Atlético. Three points for the lead."
- "Tigers drop extras to Rangers 4-3. Tough loss in the 10th."`;

  const system = `${voiceGuidanceFor(channel)}

${categoryBlock}

${lengthBudgetFor(channel)}

${language === "es"
    ? "Miami Latin Spanish. Name the loser's flaw or winner's edge if clear — don't just state the score."
    : "Plain American English. Name the loser's flaw or winner's edge if clear — don't just state the score."}`;

  const user = `Final:
${winner} ${winnerScore}, ${loser} ${loserScore} · ${game.sport}
(context: ${formatGameContext(game, language)})
${formatDedupBlock(recentMessages)}
Write ONE line wrapping it up. Output ONLY the message.`;

  return { system, user };
}
