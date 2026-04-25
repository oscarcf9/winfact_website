import {
  formatFreePickMessage as formatFreePickFromTemplates,
  formatVipTeaserMessage as formatVipTeaserFromTemplates,
  formatWinCelebrationMessage,
  formatFreeParlayMessage,
  formatVipParlayTeaserMessage,
} from "./telegram-templates";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const TELEGRAM_CONTENT_BOT_TOKEN = process.env.TELEGRAM_CONTENT_BOT_TOKEN || "";
const TELEGRAM_CONTENT_CHAT_ID = process.env.TELEGRAM_CONTENT_CHAT_ID || "570133257";

if (!TELEGRAM_BOT_TOKEN) console.warn("[telegram] TELEGRAM_BOT_TOKEN not set — all Telegram features disabled");
if (!TELEGRAM_FREE_CHAT_ID) console.warn("[telegram] TELEGRAM_FREE_CHAT_ID not set — free channel delivery disabled");
// Intentional: TELEGRAM_ADMIN_CHAT_ID is OPTIONAL. When not set, admin
// notifications fall back to TELEGRAM_FREE_CHAT_ID (operator confirmed
// they run a single chat). No need to spam the per-tick warning.

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

type ParlayLegLite = {
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
};

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
  pickType?: string | null;
  legs?: ParlayLegLite[];
};

function formatPickMessage(pick: Pick): string {
  if (pick.pickType === "parlay" && pick.legs && pick.legs.length >= 2) {
    return formatFreeParlayMessage({
      legs: pick.legs,
      odds: pick.odds,
      units: pick.units,
    });
  }
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
  text: string,
  options?: { parseMode?: "Markdown" | "HTML" | "none" }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const parseMode = options?.parseMode ?? "Markdown";
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };
    // Only set parse_mode if not "none" — allows plain text messages
    if (parseMode !== "none") {
      body.parse_mode = parseMode;
    }

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

/**
 * Send a photo with caption to a Telegram chat.
 * Used for matchup graphics, victory posts, and blog previews.
 */
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  options?: { parseMode?: "Markdown" | "HTML" | "none" }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const parseMode = options?.parseMode ?? "HTML";
    const body: Record<string, unknown> = {
      chat_id: chatId,
      photo: photoUrl,
    };
    if (caption) body.caption = caption;
    if (parseMode !== "none") body.parse_mode = parseMode;

    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return { ok: false, error: data.description || "Failed to send photo" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function formatVipTeaserMessage(pick: Pick): string {
  if (pick.pickType === "parlay" && pick.legs && pick.legs.length >= 2) {
    return formatVipParlayTeaserMessage({ legs: pick.legs });
  }
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
 * Send a notification to the admin Telegram chat.
 * Falls back to TELEGRAM_FREE_CHAT_ID when no dedicated admin chat is
 * configured — operator confirmed they run one chat for everything, so
 * "no admin chat configured" should NOT silently drop alerts.
 */
export async function sendAdminNotification(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "Telegram bot token not configured" };
  }
  const chatId = TELEGRAM_ADMIN_CHAT_ID || TELEGRAM_FREE_CHAT_ID;
  if (!chatId) {
    return { ok: false, error: "No Telegram chat configured (admin or free)" };
  }
  return sendTelegramMessage(chatId, text);
}

const CONTENT_BOT_API = TELEGRAM_CONTENT_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_CONTENT_BOT_TOKEN}`
  : "";

/**
 * Send a notification via the content bot (winfact_content_bot).
 * Supports optional inline keyboard buttons.
 */
export async function sendContentBotNotification(
  text: string,
  buttons?: { text: string; url: string }[][]
): Promise<{ ok: boolean; error?: string }> {
  const chatId = TELEGRAM_CONTENT_CHAT_ID || TELEGRAM_ADMIN_CHAT_ID;
  if (!CONTENT_BOT_API || !chatId) {
    return sendAdminNotification(text);
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    if (buttons && buttons.length > 0) {
      body.reply_markup = {
        inline_keyboard: buttons.map(row =>
          row.map(btn => ({ text: btn.text, url: btn.url }))
        ),
      };
    }

    const res = await fetch(`${CONTENT_BOT_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description || "Content bot send failed" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Notify via content bot that a new blog draft is ready.
 * Shows inline buttons: Preview, Approve (publish), Schedule.
 */
export async function notifyBlogDraftReady(params: {
  title: string;
  sport: string;
  matchup: string;
  slug: string;
  postId?: string;
  imageStatus?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
  const postId = params.postId || params.slug;
  const editUrl = `${siteUrl}/en/admin/blog/${postId}`;
  const previewUrl = `${siteUrl}/en/blog/${params.slug}`;

  const imageLine = params.imageStatus
    ? `\n🖼 Image: ${params.imageStatus}`
    : "";

  const message =
    `📝 <b>New Blog Draft</b>\n\n` +
    `<b>${params.title}</b>\n` +
    `🏟 ${params.sport} · ${params.matchup}` +
    imageLine;

  return sendContentBotNotification(message, [
    [
      { text: "👁 Preview", url: previewUrl },
      { text: "✏️ Edit & Approve", url: editUrl },
    ],
  ]);
}

/**
 * Notify via content bot that a blog has been auto-published.
 * Shows inline buttons: View Live (public URL) + Edit (admin URL).
 * Includes ES link when Spanish translation is present.
 */
export async function notifyBlogPublished(params: {
  title: string;
  sport: string;
  matchup: string;
  slug: string;
  postId?: string;
  imageStatus?: string;
  hasSpanish?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
  const postId = params.postId || params.slug;
  const editUrl = `${siteUrl}/en/admin/blog/${postId}`;
  const liveEnUrl = `${siteUrl}/en/blog/${params.slug}`;
  const liveEsUrl = `${siteUrl}/es/blog/${params.slug}`;

  const imageLine = params.imageStatus
    ? `\n🖼 Image: ${params.imageStatus}`
    : "";
  const esLine = params.hasSpanish ? `\n🇪🇸 ES: ${liveEsUrl}` : "";

  const message =
    `📰 <b>Blog auto-published</b>\n\n` +
    `<b>${params.title}</b>\n` +
    `🏟 ${params.sport} · ${params.matchup}\n` +
    `🔗 ${liveEnUrl}` +
    esLine +
    imageLine;

  const buttons: { text: string; url: string }[][] = [
    [
      { text: "🌐 View Live", url: liveEnUrl },
      { text: "✏️ Edit", url: editUrl },
    ],
  ];
  if (params.hasSpanish) {
    buttons.push([{ text: "🇪🇸 View Spanish", url: liveEsUrl }]);
  }

  return sendContentBotNotification(message, buttons);
}

/**
 * Notify that filler posts were published to social media.
 */
export async function notifyFillerPosted(params: {
  title: string;
  sport: string;
  channels: { buffer: boolean; telegram: boolean };
}): Promise<{ ok: boolean; error?: string }> {
  const channels: string[] = [];
  if (params.channels.buffer) channels.push("Buffer (IG+FB+X+Threads)");
  if (params.channels.telegram) channels.push("Telegram");

  const message =
    `✅ <b>Filler Posted</b>\n\n` +
    `${params.sport}: ${params.title}\n` +
    `📢 ${channels.join(" + ") || "No channels succeeded"}`;

  return sendContentBotNotification(message);
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
  return sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message, { parseMode: "none" });
}

export { formatPickMessage, formatResultMessage, formatVipTeaserMessage };
