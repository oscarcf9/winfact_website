const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

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

const VIP_TEASER_TEMPLATES = [
  (sport: string, siteUrl: string) =>
    `🔒 *NEW VIP PICK AVAILABLE*\n\n🏟 *${sport}* action just locked in by our analysts.\n\n📊 Our model found an edge — VIP members, check your dashboard.\n\n👉 Already a member? [View pick](${siteUrl}/dashboard)\n⬆️ Want access? [Upgrade now](${siteUrl}/pricing)\n\n#WinFactPicks #VIP #${sport}`,
  (sport: string, siteUrl: string) =>
    `🔥 *VIP PICK JUST DROPPED*\n\n🏟 Our analysts locked in a *${sport}* play with a strong model edge.\n\n💎 VIP members — your pick is live on the dashboard.\n\n👉 [Check your dashboard](${siteUrl}/dashboard)\n⬆️ Not a member yet? [Join VIP](${siteUrl}/pricing)\n\n#WinFactPicks #VIP #${sport}`,
  (sport: string, siteUrl: string) =>
    `🎯 *ALERT: New VIP Pick*\n\n🏟 *${sport}* — our model just flagged a high-value play.\n\n🔒 Full details available exclusively for VIP members.\n\n👉 [Open dashboard](${siteUrl}/dashboard)\n⬆️ [Upgrade to VIP](${siteUrl}/pricing)\n\n#WinFactPicks #VIP #${sport}`,
  (sport: string, siteUrl: string) =>
    `💰 *VIP PLAY LOCKED IN*\n\n🏟 *${sport}* edge detected. Our analysts have made their move.\n\n📈 VIP members — head to your dashboard for full details.\n\n👉 [View pick](${siteUrl}/dashboard)\n⬆️ [Get VIP access](${siteUrl}/pricing)\n\n#WinFactPicks #VIP #${sport}`,
  (sport: string, siteUrl: string) =>
    `⚡ *NEW VIP PICK ALERT*\n\n🏟 A *${sport}* VIP pick just went live.\n\n🔒 Matchup, odds, and full analysis — available on your dashboard.\n\n👉 [Go to dashboard](${siteUrl}/dashboard)\n⬆️ [Become a VIP member](${siteUrl}/pricing)\n\n#WinFactPicks #VIP #${sport}`,
];

function formatVipTeaserMessage(pick: Pick): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
  const idx = Math.floor(Math.random() * VIP_TEASER_TEMPLATES.length);
  return VIP_TEASER_TEMPLATES[idx](pick.sport, siteUrl);
}

export async function sendPickToTelegram(
  pick: Pick,
  channel: "telegram_free" | "telegram_vip"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  // All picks go to the free community group (VIP picks as teasers only)
  if (!TELEGRAM_FREE_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatPickMessage(pick);
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message);
}

/**
 * Send a VIP teaser to Telegram free group (no pick details revealed).
 */
export async function sendVipTeaserToTelegram(
  pick: Pick
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  if (!TELEGRAM_FREE_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatVipTeaserMessage(pick);
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message);
}

export async function sendResultToTelegram(
  pick: Pick & { result: string },
  channel: "telegram_free" | "telegram_vip"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const chatId = TELEGRAM_FREE_CHAT_ID;
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

/**
 * Send a notification to the admin's personal Telegram chat.
 * Used for blog draft alerts, system notifications, etc.
 */
export async function sendAdminNotification(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_ADMIN_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Admin Telegram chat not configured" };
  }
  return sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, text);
}

/**
 * Notify admin that a new auto-generated blog draft is ready for review.
 */
export async function notifyBlogDraftReady(params: {
  title: string;
  sport: string;
  matchup: string;
  slug: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
  const editUrl = `${siteUrl}/admin/blog/${params.slug}`;

  const message =
    `📝 *NEW BLOG DRAFT READY FOR REVIEW*\n\n` +
    `📰 *Title:* ${params.title}\n` +
    `🏟 *Sport:* ${params.sport}\n` +
    `📋 *Matchup:* ${params.matchup}\n\n` +
    `👉 [Review & publish](${editUrl})`;

  return sendAdminNotification(message);
}

/**
 * Notify admin when a user hits a referral reward milestone.
 */
export async function notifyReferralMilestone(params: {
  userName: string;
  userEmail: string;
  referralCount: number;
  rewardLabel: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
  const adminUrl = `${siteUrl}/admin/referrals`;

  const message =
    `🎁 *REFERRAL MILESTONE REACHED*\n\n` +
    `👤 *${params.userName || params.userEmail}*\n` +
    `📧 ${params.userEmail}\n` +
    `🔢 ${params.referralCount} converted referral${params.referralCount !== 1 ? "s" : ""}\n` +
    `🏆 Reward pending: *${params.rewardLabel}*\n\n` +
    `👉 [Review & approve](${adminUrl})`;

  return sendAdminNotification(message);
}

export { formatPickMessage, formatResultMessage, formatVipTeaserMessage };
