/**
 * Buffer GraphQL API client.
 * Uses Buffer's createIdea mutation: https://developers.buffer.com/guides/getting-started.html
 *
 * Channel routing:
 *   - Live commentary → Twitter + Threads ONLY
 *   - Filler posts → Facebook + Instagram + Twitter + Threads (+ occasionally Telegram)
 *   - Victory posts → Facebook + Instagram + Twitter + Threads
 *   - Blog links → Facebook + Telegram ONLY (handled in social-posting.ts)
 */

const BUFFER_API = "https://graph.bufferapp.com/graphql";
const BUFFER_ORG_ID = process.env.BUFFER_ORG_ID || "68dde1d4ae0ea4e53700e8cf";

const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_LIVE_TOKEN = process.env.BUFFER_LIVE_TOKEN || "";

// Channel IDs — from publish.buffer.com/channels/{id}/settings
// Override via env vars if needed
const CHANNELS = {
  instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID || "",   // check publish.buffer.com/channels for Instagram ID
  facebook: process.env.BUFFER_FACEBOOK_CHANNEL_ID || "",     // check publish.buffer.com/channels for Facebook ID
  threads: process.env.BUFFER_THREADS_CHANNEL_ID || "69d01392af47dacb6986f297",
  twitter: process.env.BUFFER_TWITTER_CHANNEL_ID || "69d014acaf47dacb6986f73f",
};

if (!BUFFER_ACCESS_TOKEN) console.warn("[buffer] BUFFER_ACCESS_TOKEN not set — social posting disabled");

/**
 * Execute a GraphQL query/mutation against Buffer API.
 */
async function bufferGraphQL(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }> {
  const accessToken = token || BUFFER_ACCESS_TOKEN;
  if (!accessToken) {
    return { errors: [{ message: "Buffer access token not configured" }] };
  }

  const res = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[buffer] GraphQL HTTP error:", res.status, text.substring(0, 300));
    return { errors: [{ message: `HTTP ${res.status}: ${text.substring(0, 200)}` }] };
  }

  return res.json();
}

/**
 * Get channel IDs for a specific routing purpose.
 */
function getChannelsForRoute(route: "all" | "text_only" | "facebook_only"): string[] {
  const ids: string[] = [];

  if (route === "text_only") {
    // Twitter + Threads only (for live commentary)
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  } else if (route === "facebook_only") {
    // Facebook only (for blog links)
    if (CHANNELS.facebook) ids.push(CHANNELS.facebook);
  } else {
    // All channels (for filler + victory posts with images)
    if (CHANNELS.instagram) ids.push(CHANNELS.instagram);
    if (CHANNELS.facebook) ids.push(CHANNELS.facebook);
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  }

  return ids;
}

/**
 * Post an idea to specific Buffer channels using createIdea mutation.
 * This is the core posting function — all public functions delegate here.
 */
async function postIdea(
  text: string,
  channelIds: string[],
  imageUrl?: string,
  token?: string
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = token || BUFFER_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "Buffer access token not configured" };
  }

  if (channelIds.length === 0) {
    return { ok: false, error: "No Buffer channels configured for this route" };
  }

  console.log(`[buffer] Posting to ${channelIds.length} channels${imageUrl ? " with image" : ""}: ${channelIds.join(", ")}`);

  let successCount = 0;
  let lastError = "";

  for (const channelId of channelIds) {
    try {
      // Build the createIdea mutation per Buffer's GraphQL API
      const mutation = `
        mutation CreateIdea {
          createIdea(input: {
            organizationId: "${BUFFER_ORG_ID}",
            content: {
              text: ${JSON.stringify(text)}
            }
            ${imageUrl ? `, media: { images: [{ url: ${JSON.stringify(imageUrl)} }] }` : ""}
            channels: ["${channelId}"]
          }) {
            ... on Idea {
              id
              content { text }
            }
            ... on MutationError {
              message
            }
          }
        }
      `;

      const result = await bufferGraphQL(mutation, undefined, accessToken);

      if (result.errors) {
        lastError = result.errors[0].message;
        console.error(`[buffer] Channel ${channelId} error:`, lastError);
        continue;
      }

      const payload = result.data?.createIdea as Record<string, unknown> | undefined;
      if (payload?.message) {
        lastError = String(payload.message);
        console.error(`[buffer] Channel ${channelId} mutation error:`, lastError);
        continue;
      }

      if (payload?.id) {
        successCount++;
        console.log(`[buffer] Channel ${channelId} → Idea ${payload.id}`);
      } else {
        successCount++; // Assume success if no error
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[buffer] Channel ${channelId} failed:`, lastError);
    }
  }

  if (successCount > 0) {
    console.log(`[buffer] Posted to ${successCount}/${channelIds.length} channels`);
    return { ok: true };
  }

  return { ok: false, error: lastError || "All channels failed" };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Post to ALL channels (Instagram, Facebook, Twitter, Threads).
 * Used for filler posts and victory posts (with images).
 */
export async function postToBufferWithMedia(
  text: string,
  imageUrl?: string,
  token?: string
): Promise<{ ok: boolean; error?: string }> {
  const channels = getChannelsForRoute("all");
  return postIdea(text, channels, imageUrl, token);
}

/**
 * Post text-only to all channels. Alias for postToBufferWithMedia without image.
 */
export async function postToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  return postToBufferWithMedia(text);
}

/**
 * Post live commentary to Twitter + Threads ONLY.
 * Text-only, no images. Uses dedicated live token if available.
 */
export async function postLiveToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = BUFFER_LIVE_TOKEN || BUFFER_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, error: "Buffer live token not configured" };
  }

  const channels = getChannelsForRoute("text_only");
  if (channels.length === 0) {
    return { ok: false, error: "No Twitter/Threads channels configured. Set BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID." };
  }

  return postIdea(text, channels, undefined, token);
}

/**
 * Post blog link to Facebook ONLY.
 * Blog URLs with OG tags — Facebook renders the preview automatically.
 */
export async function postBlogLinkToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  const channels = getChannelsForRoute("facebook_only");
  return postIdea(text, channels);
}

/**
 * Clear the channel IDs cache (unused now that channels are config-based).
 */
export function clearChannelCache(): void {
  // No-op — channels are now config-based, no cache to clear
}
