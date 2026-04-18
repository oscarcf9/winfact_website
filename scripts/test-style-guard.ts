// Per-channel style-guard smoke test (Fix 7).
// Run with: npx tsx scripts/test-style-guard.ts
import { validateStyle, TELEGRAM_CONFIG, BUFFER_CONFIG } from "../src/lib/commentary/style-guard";
import type { Channel } from "../src/lib/commentary/style-guard";

type Case = { msg: string; channel: Channel; expectOk: boolean; label: string };

const cases: Case[] = [
  // Telegram — should PASS (Miami community voice)
  { msg: "HEAT ARRIBA POR 4 🔥🔥", channel: "telegram", expectOk: true, label: "Telegram: caps + double emoji" },
  { msg: "AYY PAPA", channel: "telegram", expectOk: true, label: "Telegram: short Spanglish hype" },
  { msg: "VAMOSSSS 🔥", channel: "telegram", expectOk: true, label: "Telegram: repeated letters + emoji" },
  { msg: "Dodgers empatados con Padres en el 7mo familia, esto se pone bueno 👀", channel: "telegram", expectOk: true, label: "Telegram: informational + community" },
  { msg: "BUENOS DIAS FAMILIA 🔥", channel: "telegram", expectOk: true, label: "Telegram: greeting with hype" },
  { msg: "Kings packed it in after the Blazers' 12-0 run", channel: "telegram", expectOk: true, label: "Telegram: plain English observation" },
  { msg: "Luka can't miss from three 👀", channel: "telegram", expectOk: true, label: "Telegram: single emoji observation" },

  // Telegram — should FAIL (still banned)
  { msg: "Rays están machacando a Cleveland ahora mismo", channel: "telegram", expectOk: false, label: "Telegram: banned (está X-ando a Y)" },
  { msg: "Dos equipos jugando como si fuera práctica de bateo", channel: "telegram", expectOk: false, label: "Telegram: banned (práctica de X)" },
  { msg: "🔥🔥🔥🔥🔥 VAMOSSSS 🔥🔥🔥🔥", channel: "telegram", expectOk: false, label: "Telegram: excessive emoji count" },

  // Buffer (X/Threads) — should PASS (professional tone)
  { msg: "Heat up 4 late in the 4th. Celtics showing cracks on defense.", channel: "buffer", expectOk: true, label: "Buffer: restrained informational" },
  { msg: "Tied 3-3 in the 7th between Dodgers and Padres.", channel: "buffer", expectOk: true, label: "Buffer: clean stat reference" },
  { msg: "Bucks running away with it in Milwaukee.", channel: "buffer", expectOk: true, label: "Buffer: observation" },

  // Buffer — should FAIL (community voice not appropriate)
  { msg: "HEAT ARRIBA POR 4 🔥🔥🔥🔥", channel: "buffer", expectOk: false, label: "Buffer: too much emoji" },
  { msg: "RAYS CHOSE VIOLENCE TONIGHT AGAINST THE TWINS", channel: "buffer", expectOk: false, label: "Buffer: banned slang (chose violence)" },
  { msg: "NOBODY WANTS TO WIN THIS SO FAR IN BOSTON TONIGHT", channel: "buffer", expectOk: false, label: "Buffer: banned (nobody wants to win)" },
];

let passed = 0;
for (const c of cases) {
  const verdict = validateStyle(c.msg, [], c.channel);
  const ok = verdict.ok === c.expectOk;
  const reason = verdict.ok ? "" : ` (${verdict.reason})`;
  console.log(`${ok ? "✓" : "✗"} [${c.channel}] expected=${c.expectOk ? "pass" : "fail"} got=${verdict.ok ? "pass" : "fail"}${reason} | "${c.msg}"`);
  if (ok) passed++;
}

console.log(`\n${passed}/${cases.length} tests passed`);
console.log(`  Telegram config: emojiDensityMax=${TELEGRAM_CONFIG.emojiDensityMax} capsRatioMax=${TELEGRAM_CONFIG.capsRatioMax}`);
console.log(`  Buffer   config: emojiDensityMax=${BUFFER_CONFIG.emojiDensityMax} capsRatioMax=${BUFFER_CONFIG.capsRatioMax}`);

if (passed !== cases.length) process.exit(1);
