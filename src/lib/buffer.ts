/**
 * Buffer GraphQL API client.
 * Uses Buffer's createPost mutation to publish content to social channels.
 * Docs: https://developers.buffer.com
 *
 * Channel routing:
 *   - Live commentary → Twitter + Threads ONLY
 *   - Filler posts → Facebook + Instagram + Twitter + Threads (+ occasionally Telegram)
 *   - Victory posts → Facebook + Instagram + Twitter + Threads
 *   - Blog links → Facebook + Telegram ONLY (handled in social-posting.ts)
 */

const BUFFER_API = "https://api.buffer.com";
const BUFFER_ORG_ID = process.env.BUFFER_ORG_ID || "68dde1d4ae0ea4e53700e8cf";

const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_LIVE_TOKEN = process.env.BUFFER_LIVE_TOKEN || "";

// Channel IDs — from publish.buffer.com/channels/{id}/settings
// Override via env vars if needed
const CHANNELS = {
  instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID || "692a85d829ea336fd63c6413",
  facebook: process.env.BUFFER_FACEBOOK_CHANNEL_ID || "692a863b29ea336fd63c647f",
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
function getChannelsForRoute(route: "all" | "text_only" | "facebook_only" | "no_facebook"): string[] {
  const ids: string[] = [];

  if (route === "text_only") {
    // Twitter + Threads only (for live commentary)
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  } else if (route === "facebook_only") {
    // Facebook only (for blog links)
    if (CHANNELS.facebook) ids.push(CHANNELS.facebook);
  } else if (route === "no_facebook") {
    // All except Facebook (blog shares with images — FB requires postType not yet supported)
    if (CHANNELS.instagram) ids.push(CHANNELS.instagram);
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
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
 * Publish a post to a specific Buffer channel using createPost mutation.
 * This ACTUALLY publishes to social media (unlike createIdea which only saves to backlog).
 */
async function publishPost(
  text: string,
  channelIds: string[],
  imageUrl?: string,
  token?: string,
  publishNow?: boolean
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = token || BUFFER_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "Buffer access token not configured" };
  }

  if (channelIds.length === 0) {
    return { ok: false, error: "No Buffer channels configured for this route" };
  }

  console.log(`[buffer] Publishing to ${channelIds.length} channels${imageUrl ? " with image" : ""}: ${channelIds.join(", ")}`);

  let successCount = 0;
  let lastError = "";

  for (const channelId of channelIds) {
    try {
      // Build the createPost mutation — this actually publishes to the channel
      const assetsBlock = imageUrl
        ? `assets: { images: [{ url: ${JSON.stringify(imageUrl)} }] }`
        : "";

      const scheduleBlock = publishNow
        ? `schedulingType: immediate`
        : `schedulingType: automatic, mode: addToQueue`;

      const mutation = `
        mutation CreatePost {
          createPost(input: {
            text: ${JSON.stringify(text)},
            channelId: "${channelId}",
            ${scheduleBlock}
            ${assetsBlock ? `, ${assetsBlock}` : ""}
          }) {
            ... on PostActionSuccess {
              post {
                id
                text
                dueAt
              }
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

      const payload = result.data?.createPost as Record<string, unknown> | undefined;
      if (payload?.message) {
        lastError = String(payload.message);
        console.error(`[buffer] Channel ${channelId} mutation error:`, lastError);
        continue;
      }

      const post = payload?.post as Record<string, unknown> | undefined;
      if (post?.id) {
        successCount++;
        console.log(`[buffer] Channel ${channelId} → Post ${post.id} (dueAt: ${post.dueAt || "immediate"})`);
      } else {
        // No error but no post ID — log full response for debugging
        console.warn(`[buffer] Channel ${channelId} — unexpected response:`, JSON.stringify(result.data));
        successCount++; // Assume success if no error
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[buffer] Channel ${channelId} failed:`, lastError);
    }
  }

  if (successCount > 0) {
    console.log(`[buffer] Published to ${successCount}/${channelIds.length} channels`);
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
  return publishPost(text, channels, imageUrl, token);
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
    console.error("[buffer] postLiveToBuffer: No token available. Set BUFFER_LIVE_TOKEN or BUFFER_ACCESS_TOKEN in env vars.");
    return { ok: false, error: "Buffer live token not configured. Set BUFFER_LIVE_TOKEN or BUFFER_ACCESS_TOKEN." };
  }

  const channels = getChannelsForRoute("text_only");
  if (channels.length === 0) {
    console.error("[buffer] postLiveToBuffer: No channels. Set BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID.");
    return { ok: false, error: "No Twitter/Threads channels configured. Set BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID." };
  }

  console.log(`[buffer] postLiveToBuffer: Publishing NOW to ${channels.length} text channels (Twitter/Threads)`);
  return publishPost(text, channels, undefined, token, true);
}

/**
 * Post blog link to Facebook ONLY.
 * Blog URLs with OG tags — Facebook renders the preview automatically.
 */
export async function postBlogLinkToBuffer(text: string, imageUrl?: string): Promise<{ ok: boolean; error?: string }> {
  // Blog shares with images go to all channels except Facebook
  // (Facebook requires a postType field not yet supported in Buffer's GraphQL API)
  // Text-only blog links still go to Facebook (OG tags render the preview)
  const route = imageUrl ? "no_facebook" : "facebook_only";
  const channels = getChannelsForRoute(route);
  return publishPost(text, channels, imageUrl);
}

/**
 * Query Buffer account to verify channel IDs and organization.
 * Use this for diagnostics — call from admin endpoint.
 */
export async function verifyBufferChannels(token?: string): Promise<{
  ok: boolean;
  channels?: { id: string; name: string; service: string }[];
  error?: string;
}> {
  const query = `
    query {
      account {
        organizations {
          id
          channels {
            id
            name
            service
          }
        }
      }
    }
  `;

  const result = await bufferGraphQL(query, undefined, token);

  if (result.errors) {
    return { ok: false, error: result.errors[0].message };
  }

  const account = result.data?.account as Record<string, unknown> | undefined;
  const orgs = account?.organizations as { id: string; channels: { id: string; name: string; service: string }[] }[] | undefined;

  if (!orgs || orgs.length === 0) {
    return { ok: false, error: "No organizations found" };
  }

  // Find channels for our org
  const org = orgs.find(o => o.id === BUFFER_ORG_ID) || orgs[0];
  return { ok: true, channels: org.channels };
}

/**
 * Clear the channel IDs cache (unused now that channels are config-based).
 */
export function clearChannelCache(): void {
  // No-op — channels are now config-based, no cache to clear
}
