import type { GameContext, Language } from "../types";

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

export const SHARED_TONE_RULES = `
TONE RULES (all categories):
- Write like you're DMing a friend who also bets. Not a broadcast, not a brand.
- No ALL-CAPS for emphasis. Use word choice instead. Caps only for proper nouns.
- At most ONE emoji. Prefer NONE. Never 🔥 or 😤.
- Vary sentence structure — do NOT start with a team name + verb every time.
- Never say "WinFact." Never mention picks/odds/units/bets unless the category explicitly allows it.
- No hashtags, no quotation marks, no preamble. Output ONLY the message text.
- ONE thought per message. No comma splices. No "but" joining two clauses.
- Say what the state MEANS, not what's happening on its own. "Blazers up 10" is flat. "Kings packed it in after the Blazers' 12-0 run" lands.
`.trim();
