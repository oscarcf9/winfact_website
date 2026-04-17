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

export type ChannelKey = "instagram" | "facebook" | "threads" | "twitter";

const KNOWN_KEYS: ChannelKey[] = ["instagram", "facebook", "threads", "twitter"];

if (!BUFFER_ACCESS_TOKEN) console.warn("[buffer] BUFFER_ACCESS_TOKEN not set — social posting disabled");

/**
 * Reverse lookup: channel ID → channel key.
 */
function idToKey(channelId: string): ChannelKey | null {
  for (const k of KNOWN_KEYS) {
    if (CHANNELS[k] === channelId) return k;
  }
  return null;
}

export type PerChannelResult = {
  key: ChannelKey | null;
  id: string;
  success: boolean;
  error?: string;
  bufferPostId?: string;
};

export type PublishResult = {
  ok: boolean; // true iff at least one channel succeeded (back-compat)
  error?: string; // last error, only populated when ok === false
  allSucceeded: boolean;
  someSucceeded: boolean;
  channels: PerChannelResult[];
  failedChannels: ChannelKey[]; // channel KEYS that failed (excludes unknown-id channels)
};

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
 * Resolve a routing string to a set of channel IDs.
 *
 * Accepts either one of the preset routes ("all" / "text_only" / "facebook_only" /
 * "no_facebook") OR a comma-separated list of channel keys
 * (e.g. "instagram,facebook") used by retry rows that target specific channels.
 */
export function getChannelsForRoute(route: string): string[] {
  const ids: string[] = [];

  if (route === "text_only") {
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  } else if (route === "facebook_only") {
    if (CHANNELS.facebook) ids.push(CHANNELS.facebook);
  } else if (route === "no_facebook") {
    if (CHANNELS.instagram) ids.push(CHANNELS.instagram);
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  } else if (route === "all" || !route) {
    if (CHANNELS.instagram) ids.push(CHANNELS.instagram);
    if (CHANNELS.facebook) ids.push(CHANNELS.facebook);
    if (CHANNELS.twitter) ids.push(CHANNELS.twitter);
    if (CHANNELS.threads) ids.push(CHANNELS.threads);
  } else {
    // Comma-separated channel keys, e.g. "instagram,facebook"
    const keys = route.split(",").map((k) => k.trim().toLowerCase());
    for (const k of keys) {
      const id = (CHANNELS as Record<string, string>)[k];
      if (id) ids.push(id);
    }
  }

  return ids;
}

/**
 * Publish a post to a specific set of Buffer channels using createPost mutation.
 * This ACTUALLY publishes to social media (unlike createIdea which only saves to backlog).
 *
 * Returns per-channel success/failure so callers can retry only the failed channels.
 */
async function publishPost(
  text: string,
  channelIds: string[],
  imageUrl?: string,
  token?: string,
  publishNow?: boolean
): Promise<PublishResult> {
  const accessToken = token || BUFFER_ACCESS_TOKEN;
  const empty: PublishResult = {
    ok: false,
    allSucceeded: false,
    someSucceeded: false,
    channels: [],
    failedChannels: [],
  };

  if (!accessToken) {
    return { ...empty, error: "Buffer access token not configured" };
  }

  if (channelIds.length === 0) {
    return { ...empty, error: "No Buffer channels configured for this route" };
  }

  console.log(`[buffer] Publishing to ${channelIds.length} channels${imageUrl ? " with image" : ""}: ${channelIds.join(", ")}`);

  const channels: PerChannelResult[] = [];

  for (const channelId of channelIds) {
    const key = idToKey(channelId);
    const entry: PerChannelResult = { key, id: channelId, success: false };

    try {
      const assetsBlock = imageUrl
        ? `assets: { images: [{ url: ${JSON.stringify(imageUrl)} }] }`
        : "";

      const scheduleBlock = publishNow
        ? `schedulingType: immediate`
        : `schedulingType: automatic, mode: addToQueue`;

      const isFacebook = channelId === CHANNELS.facebook;
      const metadataBlock = isFacebook
        ? `, metadata: { facebook: { type: post } }`
        : "";

      const mutation = `
        mutation CreatePost {
          createPost(input: {
            text: ${JSON.stringify(text)},
            channelId: "${channelId}",
            ${scheduleBlock}
            ${assetsBlock ? `, ${assetsBlock}` : ""}
            ${metadataBlock}
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
        entry.error = result.errors[0].message;
        console.error(`[buffer] Channel ${channelId} (${key ?? "unknown"}) error:`, entry.error);
        channels.push(entry);
        continue;
      }

      const payload = result.data?.createPost as Record<string, unknown> | undefined;
      if (payload?.message) {
        entry.error = String(payload.message);
        console.error(`[buffer] Channel ${channelId} (${key ?? "unknown"}) mutation error:`, entry.error);
        channels.push(entry);
        continue;
      }

      const post = payload?.post as Record<string, unknown> | undefined;
      if (post?.id) {
        entry.success = true;
        entry.bufferPostId = String(post.id);
        console.log(`[buffer] Channel ${channelId} (${key ?? "unknown"}) → Post ${post.id} (dueAt: ${post.dueAt || "immediate"})`);
      } else {
        // No error but no post ID — treat as success so we don't retry an
        // already-posted item, but log full response for debugging.
        entry.success = true;
        console.warn(`[buffer] Channel ${channelId} (${key ?? "unknown"}) — unexpected response:`, JSON.stringify(result.data));
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
      console.error(`[buffer] Channel ${channelId} (${key ?? "unknown"}) threw:`, entry.error);
    }

    channels.push(entry);
  }

  const successCount = channels.filter((c) => c.success).length;
  const failedChannels = channels
    .filter((c) => !c.success)
    .map((c) => c.key)
    .filter((k): k is ChannelKey => k !== null);
  const lastError = channels.find((c) => !c.success && c.error)?.error;

  console.log(`[buffer] Published to ${successCount}/${channels.length} channels`);

  return {
    ok: successCount > 0,
    error: successCount === 0 ? (lastError || "All channels failed") : undefined,
    allSucceeded: successCount === channels.length,
    someSucceeded: successCount > 0,
    channels,
    failedChannels,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Post to ALL channels (Instagram, Facebook, Twitter, Threads) or to a
 * comma-separated subset (e.g. "instagram,facebook"). Used for filler posts
 * and victory posts (with images), and for retry rows targeting failed channels.
 */
export async function postToBufferWithMedia(
  text: string,
  imageUrl?: string,
  token?: string,
  route: string = "all"
): Promise<PublishResult> {
  const channels = getChannelsForRoute(route);
  return publishPost(text, channels, imageUrl, token);
}

/**
 * Post text-only to all channels. Alias for postToBufferWithMedia without image.
 */
export async function postToBuffer(text: string): Promise<PublishResult> {
  return postToBufferWithMedia(text);
}

/**
 * Post live commentary to Twitter + Threads ONLY.
 * Text-only, no images. Uses dedicated live token if available.
 */
export async function postLiveToBuffer(text: string): Promise<PublishResult> {
  const token = BUFFER_LIVE_TOKEN || BUFFER_ACCESS_TOKEN;
  if (!token) {
    console.error("[buffer] postLiveToBuffer: No token available. Set BUFFER_LIVE_TOKEN or BUFFER_ACCESS_TOKEN in env vars.");
    return {
      ok: false,
      error: "Buffer live token not configured. Set BUFFER_LIVE_TOKEN or BUFFER_ACCESS_TOKEN.",
      allSucceeded: false,
      someSucceeded: false,
      channels: [],
      failedChannels: [],
    };
  }

  const channels = getChannelsForRoute("text_only");
  if (channels.length === 0) {
    console.error("[buffer] postLiveToBuffer: No channels. Set BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID.");
    return {
      ok: false,
      error: "No Twitter/Threads channels configured. Set BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID.",
      allSucceeded: false,
      someSucceeded: false,
      channels: [],
      failedChannels: [],
    };
  }

  console.log(`[buffer] postLiveToBuffer: Publishing NOW to ${channels.length} text channels (Twitter/Threads)`);
  return publishPost(text, channels, undefined, token, true);
}

/**
 * Post blog link to Facebook ONLY.
 * Blog URLs with OG tags — Facebook renders the preview automatically.
 */
export async function postBlogLinkToBuffer(text: string, imageUrl?: string): Promise<PublishResult> {
  const channels = getChannelsForRoute("facebook_only");
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

  const org = orgs.find(o => o.id === BUFFER_ORG_ID) || orgs[0];
  return { ok: true, channels: org.channels };
}

/**
 * Clear the channel IDs cache (unused now that channels are config-based).
 */
export function clearChannelCache(): void {
  // No-op — channels are now config-based, no cache to clear
}
