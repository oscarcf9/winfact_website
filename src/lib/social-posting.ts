import { postToBufferWithMedia, postBlogLinkToBuffer } from "./buffer";
import { sendTelegramPhoto, sendTelegramMessage } from "./telegram";

const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";

/**
 * Post a victory celebration to social media.
 * Route: Facebook + Instagram + Twitter + Threads (all channels, with image)
 */
export async function postVictoryToSocial(post: {
  captionEn: string;
  captionEs: string;
  imageUrl: string;
  hashtags: string;
}): Promise<{ ok: boolean; error?: string }> {
  // Use Spanish caption ~60% of the time to match audience
  const caption = Math.random() < 0.6 ? post.captionEs : post.captionEn;
  const fullCaption = `${caption}\n\n${post.hashtags}`;

  try {
    return await postToBufferWithMedia(fullCaption, post.imageUrl);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Post a filler matchup graphic to social media.
 * Route: Facebook + Instagram + Twitter + Threads (all channels, with image)
 * + occasionally Telegram
 */
export async function postFillerToSocial(post: {
  captionEn: string;
  captionEs: string;
  imageUrl: string;
  hashtags: string;
}): Promise<{ ok: boolean; error?: string }> {
  const caption = Math.random() < 0.5 ? post.captionEs : post.captionEn;
  const fullCaption = `${caption}\n\n${post.hashtags}`;

  let bufferOk = false;
  let bufferError = "";

  // Post to Buffer (all channels)
  try {
    const result = await postToBufferWithMedia(fullCaption, post.imageUrl);
    bufferOk = result.ok;
    if (!result.ok) bufferError = result.error || "Buffer failed";
  } catch (error) {
    bufferError = String(error);
  }

  // Occasionally also post to Telegram (~40% chance)
  if (TELEGRAM_FREE_CHAT_ID && Math.random() < 0.4) {
    try {
      await sendTelegramPhoto(TELEGRAM_FREE_CHAT_ID, post.imageUrl, fullCaption);
    } catch (err) {
      console.error("[social] Filler Telegram post failed:", err);
    }
  }

  return bufferOk ? { ok: true } : { ok: false, error: bufferError };
}

/**
 * Post a blog link to social media.
 * Route: Facebook (via Buffer) + Telegram ONLY
 */
export async function postBlogToSocial(post: {
  title: string;
  url: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const caption = `📝 ${post.title}\n\n${post.url}`;
  let anyOk = false;

  // Facebook via Buffer
  try {
    const result = await postBlogLinkToBuffer(caption);
    if (result.ok) anyOk = true;
    else console.error("[social] Blog Buffer failed:", result.error);
  } catch (error) {
    console.error("[social] Blog Buffer error:", error);
  }

  // Telegram
  if (TELEGRAM_FREE_CHAT_ID) {
    try {
      const result = await sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, caption, { parseMode: "none" });
      if (result.ok) anyOk = true;
      else console.error("[social] Blog Telegram failed:", result.error);
    } catch (error) {
      console.error("[social] Blog Telegram error:", error);
    }
  }

  return anyOk ? { ok: true } : { ok: false, error: "Both Facebook and Telegram failed" };
}
