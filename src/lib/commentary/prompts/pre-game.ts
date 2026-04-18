import type { GameContext, Language } from "../types";
import type { Channel } from "../style-guard";
import { voiceGuidanceFor, lengthBudgetFor, formatDedupBlock } from "./_shared";

export const TEMPERATURE: Record<Channel, number> = {
  telegram: 0.90,
  buffer: 0.75,
};

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  channel: Channel;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, channel, recentMessages } = input;

  const categoryBlock = channel === "telegram"
    ? `
CATEGORY: pre_game on Telegram. Game starts in 20-30 min. Community heads-up.

EXAMPLES OF GOOD Telegram pre_game messages:
- "HEAT vs CELTICS en 25 minutos mi gente 🔥 no Butler esta noche, ojo a la línea"
- "DODGERS vs PADRES empezando a las 7 papa 👀 Glasnow vs Darvish, total en 7.5"
- "Real Madrid vs Barça en media hora familia, pick del día saliendo 🔥"
- "BUENOS DIAS FAMILIA 🔥 hoy hay mucho béisbol"
- "NFL Thursday night en 20 min asere, ojo a este total"`
    : `
CATEGORY: pre_game on X/Threads. Sharp flag on what's worth watching. Market read, injury read, matchup read; not a reaction.

EXAMPLES OF GOOD Buffer pre_game messages:
- "Heat host Celtics at 7. Butler out, spread sitting at Boston -3, total 218. Miami's bench has been the sneaky story this month, watch the second unit minutes."
- "Dodgers-Padres first pitch in 20. Glasnow vs Darvish, total 7.5 and ticking down. Both lineups quiet vs righties on the road, under looks live early."
- "Madrid-Barca kicking off in 30. Lineups confirmed, no surprises. Atleti at home has covered every line of their last six, watch the first-half spread."
- "Thursday Night Football in 20. Total crept from 44 to 46.5 post-injury report, books respecting something the public isn't."`;

  const system = `${voiceGuidanceFor(channel)}

${categoryBlock}

${lengthBudgetFor(channel)}

${language === "es"
    ? "Miami Latin Spanish. Don't predict a winner. Don't give a pick. Flag that this is on your radar."
    : "Plain American English. Don't predict a winner. Don't give a pick. Name what a sharp observer would watch for."}`;

  const user = `Upcoming game:
${game.team1} @ ${game.team2} · ${game.sport}${game.startTime ? ` · starts ${game.startTime}` : ""}
${formatDedupBlock(recentMessages)}
Write ONE line. Output ONLY the message.`;

  return { system, user };
}
