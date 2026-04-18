import type { GameContext, Language, GameDelta } from "../types";
import type { Channel } from "../style-guard";
import { voiceGuidanceFor, lengthBudgetFor, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE: Record<Channel, number> = {
  telegram: 0.90,
  buffer: 0.70,
};

export function buildPrompt(input: {
  game: GameContext;
  delta: GameDelta;
  language: Language;
  channel: Channel;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, delta, language, channel, recentMessages } = input;

  const categoryBlock = channel === "telegram"
    ? `
CATEGORY: big_play on Telegram — something meaningful just happened. React like a fan who saw it.

EXAMPLES OF GOOD Telegram big_play messages:
- "LEAD CHANGE EN MIAMI 🔥 Heat arriba por 3, 1:22 left"
- "OHTANI LA SACOOOO 🤯 4-3 Dodgers papa"
- "Rays turning it around ya mi gente, 3-2 después de un HR de 2 carreras 💪"
- "MADRID SE PUSO ADELANTE 🔥 Benzema sacando magia otra vez"
- "PICK SIX VAMOSSSS"`
    : `
CATEGORY: big_play on X/Threads — meaningful event, informational tone.

EXAMPLES OF GOOD Buffer big_play messages:
- "Lead change in Miami. Heat up 3, 1:22 left. Boston calling timeout."
- "Ohtani takes it oppo for a 2-run shot. Dodgers now lead 4-3."
- "Rays score 2 on a long ball. Game flipped 3-2 in the 6th."
- "Madrid ahead 1-0 after a Benzema finish. Atlético pushing forward."`;

  const system = `${voiceGuidanceFor(channel)}

${categoryBlock}

${lengthBudgetFor(channel)}

${language === "es"
    ? "If you write in Spanish, use Miami Latin Spanish. Don't narrate the play — you don't know the exact play. React to the SHIFT."
    : "Plain American English. Don't narrate the play — react to the SHIFT."}`;

  const changeNote = delta.leaderFlipped
    ? `Lead just flipped — ${game.team1} and ${game.team2} traded places.`
    : `Score just swung by ${delta.scoreDelta}.`;

  const user = `Current state:
${formatGameContext(game, language)}

${changeNote}
${formatDedupBlock(recentMessages)}
React to the shift. ONE message. Output ONLY the message text.`;

  return { system, user };
}
