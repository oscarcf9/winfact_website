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
CATEGORY: pre_game on Telegram — game starts in 20-30 min. Community heads-up.

EXAMPLES OF GOOD Telegram pre_game messages:
- "HEAT vs CELTICS en 25 minutos mi gente 🔥 no Butler esta noche, ojo a la línea"
- "DODGERS vs PADRES empezando a las 7 papa 👀 Glasnow vs Darvish, total en 7.5"
- "Real Madrid vs Barça en media hora familia, pick del día saliendo 🔥"
- "BUENOS DIAS FAMILIA 🔥 hoy hay mucho béisbol"
- "NFL Thursday night en 20 min asere, ojo a este total"`
    : `
CATEGORY: pre_game on X/Threads — professional pre-game flag.

EXAMPLES OF GOOD Buffer pre_game messages:
- "Heat host Celtics at 7. Butler remains out; watch the line move."
- "Dodgers-Padres first pitch in 20. Glasnow vs Darvish, total 7.5."
- "Madrid-Barça starting soon. Lineups confirmed; no surprises."
- "Thursday Night Football in 20 minutes. Total ticking up late."`;

  const system = `${voiceGuidanceFor(channel)}

${categoryBlock}

${lengthBudgetFor(channel)}

${language === "es"
    ? "Miami Latin Spanish. Don't predict a winner. Don't give a pick. Flag that this is on your radar."
    : "Plain American English. Don't predict a winner. Don't give a pick. Flag what you're watching."}`;

  const user = `Upcoming game:
${game.team1} @ ${game.team2} · ${game.sport}${game.startTime ? ` · starts ${game.startTime}` : ""}
${formatDedupBlock(recentMessages)}
Write ONE line. Output ONLY the message.`;

  return { system, user };
}
