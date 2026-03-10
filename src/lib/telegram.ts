const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";
const TELEGRAM_VIP_CHAT_ID = process.env.TELEGRAM_VIP_CHAT_ID || "";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

type Pick = {
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  analysisEn?: string | null;
  tier?: string | null;
  modelEdge?: number | null;
};

function formatPickMessage(pick: Pick): string {
  const oddsStr = pick.odds != null ? (pick.odds > 0 ? `+${pick.odds}` : String(pick.odds)) : "N/A";
  const confidence = pick.confidence
    ? pick.confidence.charAt(0).toUpperCase() + pick.confidence.slice(1)
    : "Standard";

  let msg = `🎯 *NEW PICK*\n\n`;
  msg += `🏟 *${pick.sport}*\n`;
  msg += `📋 ${pick.matchup}\n\n`;
  msg += `✅ *${pick.pickText}*\n`;
  if (pick.odds != null) msg += `📊 Odds: \`${oddsStr}\`\n`;
  if (pick.units != null) msg += `💰 Units: \`${pick.units}\`\n`;
  msg += `🔥 Confidence: *${confidence}*\n`;

  if (pick.modelEdge) {
    msg += `📈 Edge: \`${pick.modelEdge.toFixed(1)}%\`\n`;
  }

  if (pick.analysisEn) {
    msg += `\n📝 _${pick.analysisEn}_\n`;
  }

  if (pick.tier === "vip") {
    msg += `\n🔒 *VIP PICK*`;
  } else {
    msg += `\n🆓 *FREE PICK*`;
  }

  msg += `\n\n⏰ ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true })} ET`;

  return msg;
}

function formatResultMessage(pick: Pick & { result: string }): string {
  const emoji = pick.result === "win" ? "✅" : pick.result === "loss" ? "❌" : "🔄";
  const label = pick.result.toUpperCase();

  let msg = `${emoji} *RESULT: ${label}*\n\n`;
  msg += `🏟 ${pick.sport} | ${pick.matchup}\n`;
  msg += `📋 ${pick.pickText}\n`;
  const u = pick.units ?? 0;
  msg += `💰 ${pick.result === "win" ? `+${u}` : pick.result === "loss" ? `-${u}` : "0"}u\n`;

  return msg;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return { ok: false, error: data.description || "Unknown error" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function sendPickToTelegram(
  pick: Pick,
  channel: "telegram_free" | "telegram_vip"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const chatId = channel === "telegram_free" ? TELEGRAM_FREE_CHAT_ID : TELEGRAM_VIP_CHAT_ID;
  if (!chatId || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatPickMessage(pick);
  return sendTelegramMessage(chatId, message);
}

export async function sendResultToTelegram(
  pick: Pick & { result: string },
  channel: "telegram_free" | "telegram_vip"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const chatId = channel === "telegram_free" ? TELEGRAM_FREE_CHAT_ID : TELEGRAM_VIP_CHAT_ID;
  if (!chatId || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatResultMessage(pick);
  return sendTelegramMessage(chatId, message);
}

export async function testTelegramConnection(): Promise<{ ok: boolean; botName?: string; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: "No bot token configured" };
  try {
    const res = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await res.json();
    if (data.ok) {
      return { ok: true, botName: data.result?.username };
    }
    return { ok: false, error: data.description };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export { formatPickMessage, formatResultMessage };
