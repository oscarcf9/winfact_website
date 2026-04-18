import type { GameContext, GameStateBucket, Language } from "../types";
import type { Channel } from "../style-guard";
import { voiceGuidanceFor, lengthBudgetFor, formatGameContext, formatDedupBlock } from "./_shared";

export const TEMPERATURE: Record<Channel, number> = {
  telegram: 0.95, // higher — encourage community voice variety
  buffer: 0.75,   // lower — tighter professional tone
};

export function buildPrompt(input: {
  game: GameContext;
  bucket: GameStateBucket;
  language: Language;
  channel: Channel;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, bucket, language, channel, recentMessages } = input;

  const categoryBlock = channel === "telegram"
    ? `
CATEGORY: game_reaction on Telegram. React like a fan watching with the group.

WHAT TO WRITE:
- Acknowledge the state (close game, blowout, late clock, run going)
- Hint at the team's momentum without overselling
- Include community energy; this is mi gente watching together

EXAMPLES OF GOOD Telegram game_reaction messages:
- "Bucks machacando esto ya mi gente 🔥 22 arriba en el Q2 👀"   (use AS INSPIRATION, don't copy verbatim)
- "Heat defense dormida en el segundo tiempo, pero OK por ahora"
- "Dodgers empatados en el 7mo familia, esto se pone bueno 👀"
- "YANKS con todo, 3-0 en el 5to papa 💪"
- "Game cerrado entre Celtics y Sixers, esto va hasta el final 🔥"`
    : `
CATEGORY: game_reaction on X/Threads. Sharp-bettor read. One real observation, not just the score.

WHAT TO WRITE:
- Name the pattern, mismatch, or adjustment you're seeing
- Tie the score to WHY it looks like that
- Neutral, confident tone; no hype

EXAMPLES OF GOOD Buffer game_reaction messages:
- "Bucks doing whatever they want in the paint. Brooklyn's bigs 2 steps slow on every rotation and Milwaukee keeps running the same set until it stops working."
- "Heat defense tightening in the half court. Boston getting nothing easy on the second side, shot clock down to 4 every possession."
- "Tied 3-3 through 6 in San Diego. Bullpens warming on both sides, leverage arms likely from the 7th on."
- "Dodgers up 3-0 through 5. Glasnow working ahead, 9 swings-and-misses already, Padres lineup looking uncomfortable."`;

  const system = `${voiceGuidanceFor(channel)}

${categoryBlock}

${lengthBudgetFor(channel)}

${language === "es"
    ? "If you write in Spanish, use Miami Latin Spanish; Cuban/Venezuelan/Colombian, NOT Mexican."
    : "Plain American English."}`;

  const user = `Current state (bucket: ${bucket}):
${formatGameContext(game, language)}
${formatDedupBlock(recentMessages)}
Write ONE message that fits this ${bucket.replace("_", " ")} situation. Output ONLY the message text. No preamble, no meta, no options.`;

  return { system, user };
}
