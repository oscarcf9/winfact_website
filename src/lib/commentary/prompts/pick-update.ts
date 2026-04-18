import type { GameContext, Language } from "../types";
import type { Channel } from "../style-guard";
import { voiceGuidanceFor, lengthBudgetFor, formatGameContext, formatDedupBlock } from "./_shared";

// pick_update is Telegram-ONLY (per CATEGORY_CHANNELS in index.ts).
// The channel param exists for signature symmetry; Buffer invocation
// returns a safe no-op marker the cron filters out.
export const TEMPERATURE: Record<Channel, number> = {
  telegram: 0.70,
  buffer: 0.50,
};

export function buildPrompt(input: {
  game: GameContext;
  language: Language;
  channel: Channel;
  recentMessages: string[];
}): { system: string; user: string } {
  const { game, language, channel, recentMessages } = input;

  // Defensive: if called with buffer channel, instruct Claude to emit the
  // sentinel so the caller can detect and drop. In practice the cron should
  // never invoke pick_update on buffer — CATEGORY_CHANNELS blocks it.
  if (channel === "buffer") {
    const system = "You are a no-op generator. Respond with exactly the single token: __SKIP__";
    const user = "Respond with __SKIP__ only.";
    return { system, user };
  }

  const system = `${voiceGuidanceFor(channel)}

CATEGORY: pick_update on Telegram — members know a WinFact pick is live on this game. Give them a read on how it's trending.

OVERRIDES:
- You MAY reference "nuestro pick", "the ticket", "nuestro +4.5", "our over" — members know about the pick.
- Do NOT reveal the specific pick text, odds, or units. Just the vibe.
- Don't claim victory until settled — say "se ve bien" / "looking good" / "en peligro" / "might be in trouble".

EXAMPLES OF GOOD Telegram pick_update messages:
- "NUESTRO +4.5 SE VE BIEN FAMILIA 🔥 Heat con el lead"
- "Over 8.5 looking good papa 🤑 7 runs en 5 innings"
- "Giants -3.5 en peligro 👀 lead cortado a 2, quedan 9 min"
- "Pick update mi gente: nuestro over está cobrando 🔥"
- "Watch out on the under, Dodgers despertaron"

${lengthBudgetFor(channel)}

${language === "es"
    ? "Miami Latin Spanish — confident but measured. This is a pick update, not a celebration (unless already cobrando)."
    : "Plain American English, confident but not hype."}`;

  const user = `Current state (a WinFact pick is live on this game):
${formatGameContext(game, language)}
${formatDedupBlock(recentMessages)}
Write ONE line updating members on how the pick is trending. Output ONLY the message.`;

  return { system, user };
}
