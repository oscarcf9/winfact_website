import { postToBufferWithMedia, postBlogLinkToBuffer, type PublishResult, type ChannelKey } from "./buffer";
import { sendTelegramPhoto, sendTelegramMessage } from "./telegram";

function truncateTelegramCaption(caption: string): string {
  // Telegram caption limit is 1024 chars. Truncate gracefully.
  if (caption.length <= 1024) return caption;
  return caption.substring(0, 1021) + "...";
}

const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";

export type SocialResult = {
  ok: boolean;
  error?: string;
  allSucceeded: boolean;
  someSucceeded: boolean;
  failedChannels: ChannelKey[]; // channel keys that failed (for retry enqueue)
  buffer?: PublishResult; // raw Buffer result for callers that want detail
};

function bufferToSocial(result: PublishResult): SocialResult {
  return {
    ok: result.ok,
    error: result.error,
    allSucceeded: result.allSucceeded,
    someSucceeded: result.someSucceeded,
    failedChannels: result.failedChannels,
    buffer: result,
  };
}

/**
 * Post a victory celebration to social media.
 * Route: Facebook + Instagram + Twitter + Threads (all channels, with image)
 * `route` lets retry rows target only a subset (e.g. "instagram,facebook").
 */
export async function postVictoryToSocial(post: {
  captionEn: string;
  captionEs: string;
  imageUrl: string;
  hashtags: string;
  route?: string;
}): Promise<SocialResult> {
  // Use Spanish caption ~60% of the time to match audience
  const caption = Math.random() < 0.6 ? post.captionEs : post.captionEn;
  const fullCaption = `${caption}\n\n${post.hashtags}`;

  try {
    const result = await postToBufferWithMedia(fullCaption, post.imageUrl, undefined, post.route || "all");
    return bufferToSocial(result);
  } catch (error) {
    return {
      ok: false,
      error: String(error),
      allSucceeded: false,
      someSucceeded: false,
      failedChannels: [],
    };
  }
}

/**
 * Post a filler matchup graphic to social media.
 * Route: Facebook + Instagram + Twitter + Threads (all channels, with image)
 * + occasionally Telegram.
 * `route` lets retry rows target only a subset.
 */
export async function postFillerToSocial(post: {
  captionEn: string;
  captionEs: string;
  imageUrl: string;
  hashtags: string;
  route?: string;
}): Promise<SocialResult> {
  const caption = Math.random() < 0.5 ? post.captionEs : post.captionEn;
  const fullCaption = `${caption}\n\n${post.hashtags}`;

  let bufferResult: PublishResult;
  try {
    bufferResult = await postToBufferWithMedia(fullCaption, post.imageUrl, undefined, post.route || "all");
  } catch (error) {
    return {
      ok: false,
      error: String(error),
      allSucceeded: false,
      someSucceeded: false,
      failedChannels: [],
    };
  }

  // Occasionally also post to Telegram (~40% chance). Not tracked per-channel —
  // Telegram is a fire-and-forget extra, not part of the retry surface.
  if (TELEGRAM_FREE_CHAT_ID && Math.random() < 0.4) {
    sendTelegramPhoto(TELEGRAM_FREE_CHAT_ID, post.imageUrl, fullCaption).catch((err) =>
      console.error("[social] Filler Telegram post failed:", err)
    );
  }

  return bufferToSocial(bufferResult);
}

/**
 * Post a blog link to social media.
 * Route: Facebook (via Buffer, with image if available) + Telegram (photo+caption if
 * image available, text otherwise).
 *
 * When the blog has a featured image the Telegram post uses sendTelegramPhoto so
 * the image actually renders — previously it was a text-only link with no preview.
 * Facebook preview also gets the explicit image URL rather than relying on OG tags.
 */
export async function postBlogToSocial(post: {
  title: string;
  url: string;
  imageUrl?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const caption = `📝 ${post.title}\n\n${post.url}`;
  let anyOk = false;

  try {
    const result = await postBlogLinkToBuffer(caption, post.imageUrl || undefined);
    if (result.ok) anyOk = true;
    else console.error("[social] Blog Buffer failed:", result.error);
  } catch (error) {
    console.error("[social] Blog Buffer error:", error);
  }

  if (TELEGRAM_FREE_CHAT_ID) {
    try {
      // Use photo+caption if image exists, text otherwise.
      const result = post.imageUrl
        ? await sendTelegramPhoto(
            TELEGRAM_FREE_CHAT_ID,
            post.imageUrl,
            truncateTelegramCaption(caption),
            { parseMode: "none" }
          )
        : await sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, caption, { parseMode: "none" });
      if (result.ok) anyOk = true;
      else console.error("[social] Blog Telegram failed:", result.error);
    } catch (error) {
      console.error("[social] Blog Telegram error:", error);
    }
  }

  return anyOk ? { ok: true } : { ok: false, error: "Both Facebook and Telegram failed" };
}
