// Quick sanity check for the style guard. Run with: node scripts/test-style-guard.mjs
// NOTE: uses tsx-like import syntax via a compiled path; prefer `npx tsx` if available.

import { validateStyle } from "../src/lib/commentary/style-guard";

const cases = [
  // offenders — all should reject
  { msg: "RAYS JUST WOKE UP AND CHOSE VIOLENCE 🔥", expectOk: false },
  { msg: "Rays están machacando a Yankees 🔥", expectOk: false }, // caps_ratio or terminal_emoji
  { msg: "Estos dos equipos jugando como si fuera práctica de bateo", expectOk: false }, // banned template
  { msg: "Nobody wants to win this game", expectOk: false },
  { msg: "Kings packed it in after the Blazers' 12-0 run", expectOk: true },
  { msg: "Celtics bench just stole this game", expectOk: true },
  { msg: "Luka can't miss from three 👀", expectOk: true },
  { msg: "🔥🔥🔥 THIS RUN IS CRAZY 🔥🔥🔥", expectOk: false }, // emoji overload + caps
  { msg: "WHAT A PLAY", expectOk: true }, // short, caps allowed
];

let passed = 0;
for (const c of cases) {
  const verdict = validateStyle(c.msg, []);
  const ok = verdict.ok === c.expectOk;
  console.log(`${ok ? "✓" : "✗"} ok=${verdict.ok}${verdict.ok ? "" : ` (${verdict.reason})`} | "${c.msg}"`);
  if (ok) passed++;
}
console.log(`\n${passed}/${cases.length} expected outcomes`);
