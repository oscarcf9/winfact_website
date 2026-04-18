import type { GameContext, Language } from "../types";
import type { Channel } from "../style-guard";

/**
 * Compact natural-language description of the current state.
 * Keeps the user-prompt short so Claude doesn't fixate on numbers.
 */
export function formatGameContext(game: GameContext, language: Language): string {
  const sport = game.sport;
  const periodLabel = ((): string => {
    if (sport === "MLB") return `${ordinal(game.period)} inning`;
    if (sport === "NHL") return `${ordinal(game.period)} period`;
    if (sport === "NBA" || sport === "NFL") return `${ordinal(game.period)} quarter`;
    if (["LALIGA", "PREMIER", "LIGA_MX", "UCL"].includes(sport)) {
      return game.period === 1 ? "1st half" : "2nd half";
    }
    return `period ${game.period}`;
  })();

  if (language === "es") {
    return `${game.team1} ${game.score1} @ ${game.team2} ${game.score2}, ${periodLabel}${game.clock ? `, reloj ${game.clock}` : ""}`;
  }
  return `${game.team1} ${game.score1} @ ${game.team2} ${game.score2}, ${periodLabel}${game.clock ? `, clock ${game.clock}` : ""}`;
}

export function formatDedupBlock(recent: string[]): string {
  if (recent.length === 0) return "";
  return `\nYour last ${recent.length} messages (do NOT repeat phrasing, sentence structure, or sentiment):\n${recent
    .map((m, i) => `${i + 1}. ${m}`)
    .join("\n")}\n`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Telegram voice: Miami community, Latin fan group chat. This is the Las
 * Mieles benchmark — "MUY FÁCIL ESA VICTORIA DE CLEVELAND MI GENTE 🔥💪",
 * "AYY PAPA", "VAMOSSSS", "BUENOS DIAS FAMILIA".
 */
export const TELEGRAM_VOICE_GUIDANCE = `
VOICE: Miami sports bar. Latin community. Natural Spanglish. You are a friend reacting to the game with mi gente watching together.

LANGUAGE MIX (rough targets, don't overthink):
- 60% Spanish primary (natural, not formal — Miami Cuban/Venezuelan/Colombian Spanish, NOT Mexican)
- 30% Spanglish (mix English team names and hype words into Spanish sentences)
- 10% English (when context requires it — American team proper nouns, stat references)

COMMUNITY WORDS — use naturally, don't force every message:
- "mi gente", "familia", "muchachos", "papa", "asere" (Cuban-flavored)
- "vamos", "vamossss", "dale", "bueno"

TEAM REFERENCES — mention teams by name casually:
- Keep official team names readable: HEAT, CELTICS, YANKEES, DODGERS, MADRID, BARCA
- Spanish-language soccer teams keep their Spanish names
- Don't over-describe ("Los Miami Heat del estado de Florida") — just "HEAT" or "Miami"

TONE:
- Short bursts are GOOD — 4 to 15 words is the sweet spot
- Caps for emphasis is GOOD — "VAMOSSS" / "HEAT ARRIBA" / "BUENOS DIAS FAMILIA"
- Terminal 🔥 / 😤 / 👀 / 💪 / 🤑 are fine — just don't stack 5 of them
- Exclamation marks are fine — don't sanitize your writing
- React like a fan, not like a news anchor

DO NOT:
- Write long explanatory sentences — this is a reaction, not an essay
- Use "está X-ando a Y" pattern (machacando, humillando, aplastando) — repetitive
- Use "práctica de X" (bateo, primavera) — repetitive
- Write like ChatGPT — sound like a person
- Use hashtags
- Wrap output in quotes
`.trim();

/**
 * Buffer voice: professional observer for X + Threads. Broader public reach,
 * measured tone. Informational, dry, no Spanglish.
 */
export const BUFFER_VOICE_GUIDANCE = `
VOICE: Professional sports observer. Informed. Dry. Not hype-driven.

LANGUAGE: English only. No Spanish code-switching on Buffer channels (X/Threads). Broader reach, not community.

TONE:
- Measured and informational
- Short but not punchy — 10 to 25 words
- Team names capitalized but sentences are in normal case
- Stats and context over reactions
- Think sports analytics Twitter, not sports bar

EMOJI: Minimal. At most ONE per message. Often zero. Never as emphasis.

CAPS: Only for proper nouns. No "MADNESS" or "CHAOS" caps-lock emphasis.

DO NOT:
- Use "chose violence", "nobody wants to win this", or similar slang that reads try-hard on X
- Reference specific WinFact picks, units, spreads, or "our plays" — those stay on Telegram only
- Use more than one exclamation mark per message
- Try to be hype — that's Telegram's lane
- Use hashtags
- Wrap output in quotes
`.trim();

/**
 * Select the voice guidance block for the target channel.
 */
export function voiceGuidanceFor(channel: Channel): string {
  return channel === "telegram" ? TELEGRAM_VOICE_GUIDANCE : BUFFER_VOICE_GUIDANCE;
}

/**
 * Per-channel soft length budget (informational — prompts also include it
 * explicitly). Claude uses it as a hint.
 */
export function lengthBudgetFor(channel: Channel): string {
  return channel === "telegram"
    ? "Max 120 characters. Shorter is better — 4-15 words is the sweet spot."
    : "Max 220 characters. 10-25 words is the sweet spot.";
}
