import { postToBuffer, postToBufferWithMedia } from "./buffer";

type SocialPost = {
  caption: string;
  imageUrl?: string;
  platform?: "all" | "instagram" | "twitter" | "threads" | "facebook";
};

/**
 * Post content to social media via Buffer.
 * Buffer handles cross-posting to connected platforms (Instagram, Twitter, Threads, Facebook).
 * Supports both text-only and image posts.
 *
 * Returns true if at least one platform succeeded.
 */
export async function postToSocial(post: SocialPost): Promise<{ ok: boolean; error?: string }> {
  try {
    if (post.imageUrl) {
      return await postToBufferWithMedia(post.caption, post.imageUrl);
    }
    return await postToBuffer(post.caption);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Post a victory celebration to social media (image + caption).
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
  return postToSocial({ caption: fullCaption, imageUrl: post.imageUrl });
}

/**
 * Post a filler matchup graphic to social media (image + caption).
 */
export async function postFillerToSocial(post: {
  captionEn: string;
  captionEs: string;
  imageUrl: string;
  hashtags: string;
}): Promise<{ ok: boolean; error?: string }> {
  const caption = Math.random() < 0.5 ? post.captionEs : post.captionEn;
  const fullCaption = `${caption}\n\n${post.hashtags}`;
  return postToSocial({ caption: fullCaption, imageUrl: post.imageUrl });
}

/**
 * Post a blog link to social media.
 */
export async function postBlogToSocial(post: {
  title: string;
  url: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const caption = `📝 ${post.title}\n\n${post.url}`;
  return postToSocial({ caption, imageUrl: post.imageUrl });
}
