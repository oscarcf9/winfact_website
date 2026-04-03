import {
  formatFreePickMessage as formatFreePickFromTemplates,
  formatVipTeaserMessage as formatVipTeaserFromTemplates,
  formatWinCelebrationMessage,
} from "./telegram-templates";

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
  stars?: number | null;
  analysisEn?: string | null;
  tier?: string | null;
  modelEdge?: number | null;
};

function formatPickMessage(pick: Pick): string {
  return formatFreePickFromTemplates(pick);
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

function formatVipTeaserMessage(pick: Pick): string {
  return formatVipTeaserFromTemplates(pick);
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
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

/**
 * Post a win celebration message to the free Telegram group.
 * Called by the auto-settler when a pick is settled as a win.
 * Fire-and-forget — errors are logged but never throw.
 */
export async function sendWinCelebration(pick: {
  sport: string;
  matchup: string;
  pickText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_FREE_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram not configured" };
  }
  const message = formatWinCelebrationMessage(pick);
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message);
}

export { formatPickMessage, formatResultMessage, formatVipTeaserMessage };
