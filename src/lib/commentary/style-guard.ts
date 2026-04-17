/**
 * Post-generation quality filter.
 *
 * Every candidate message runs through this before we log or ship it.
 * Failures return a reason the caller uses to decide whether to retry
 * (once, with the rejected message added to the dedup list) or skip the tick.
 */

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const BANNED_TEMPLATES: { pattern: RegExp; reason: string }[] = [
  { pattern: /est[áa]\s+\w+ando\s+a\s+\w/i, reason: "banned_template:está_X-ando_a_Y" },
  { pattern: /pr[áa]ctica\s+de\s+\w+/i, reason: "banned_template:práctica_de_X" },
  { pattern: /chose\s+violence/i, reason: "banned_template:chose_violence" },
  { pattern: /nobody\s+wants\s+to\s+win/i, reason: "banned_template:nobody_wants_to_win" },
  { pattern: /como\s+si\s+fuera\s+pr[áa]ctica/i, reason: "banned_template:como_si_fuera_practica" },
];

const TRAILING_EMOJI_REGEX = /[\u{1F525}\u{1F624}]\s*$/u; // 🔥 😤 at end

/**
 * Word-level Jaccard similarity between two strings (case-insensitive,
 * ignoring short stopwords and punctuation).
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  const inter = new Set<string>();
  for (const x of A) if (B.has(x)) inter.add(x);
  const union = new Set<string>([...A, ...B]);
  return inter.size / union.size;
}

/**
 * Stable 0..1 hash used to gate the "terminal emoji quota" rule
 * deterministically (so retries with the same message don't re-pass the
 * quota check — they must actually change the text).
 */
function stableHash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export type StyleVerdict = { ok: true } | { ok: false; reason: string };

export function validateStyle(message: string, recentMessages: string[] = []): StyleVerdict {
  const msg = message.trim();
  if (!msg) return { ok: false, reason: "empty" };

  // Rule 1: Emoji density.
  // Count emoji vs word count; reject if ratio > 0.4 OR if > 2 emojis total.
  const emojiMatches = msg.match(EMOJI_REGEX) || [];
  const wordCount = msg
    .replace(EMOJI_REGEX, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  if (emojiMatches.length > 2) {
    return { ok: false, reason: "emoji_count_too_high" };
  }
  if (wordCount > 0 && emojiMatches.length / wordCount > 0.4) {
    return { ok: false, reason: "emoji_density_too_high" };
  }

  // Rule 2: Caps ratio. Only penalize on longer messages (>30 chars).
  if (msg.length > 30) {
    let upper = 0;
    let lettersTotal = 0;
    for (const ch of msg) {
      if (ch >= "A" && ch <= "Z") {
        upper++;
        lettersTotal++;
      } else if (ch >= "a" && ch <= "z") {
        lettersTotal++;
      }
    }
    if (lettersTotal > 0 && upper / lettersTotal > 0.5) {
      return { ok: false, reason: "caps_ratio_too_high" };
    }
  }

  // Rule 3: Banned templates.
  for (const { pattern, reason } of BANNED_TEMPLATES) {
    if (pattern.test(msg)) return { ok: false, reason };
  }

  // Rule 4: Jaccard similarity vs recent messages.
  for (const rec of recentMessages) {
    const sim = jaccardSimilarity(msg, rec);
    if (sim > 0.5) {
      return { ok: false, reason: `similar_to_recent:jaccard=${sim.toFixed(2)}` };
    }
  }

  // Rule 5: Terminal emoji quota. 🔥/😤 at end allowed with probability ~0.3
  // (deterministic per message). This breaks the >85% trailing-emoji pattern
  // observed in the current output.
  if (TRAILING_EMOJI_REGEX.test(msg)) {
    const score = stableHash01(msg);
    if (score >= 0.3) return { ok: false, reason: "terminal_emoji_quota" };
  }

  return { ok: true };
}

/**
 * Exposed for tests.
 */
export const __internals = { jaccardSimilarity, stableHash01 };
