/**
 * Buffer GraphQL API client for cross-posting to Twitter/X, Threads, Instagram, Facebook.
 * Uses Buffer GraphQL API: https://api.buffer.com
 * Supports text posts, image posts, and channel management.
 * Fire-and-forget — failures are logged but never throw.
 */

const BUFFER_API = "https://api.buffer.com";
const BUFFER_ORG_ID = process.env.BUFFER_ORG_ID || "";

// Two keys: one for scheduled content, one for live commentary
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_LIVE_TOKEN = process.env.BUFFER_LIVE_TOKEN || "";

// Known channel IDs — used as fallback when env/API lookup fails
const KNOWN_CHANNEL_IDS = [
  "692a85d829ea336fd63c6413", // Instagram
  "692a863b29ea336fd63c647f", // Facebook
];

// Text-only channels (Twitter/Threads/Facebook — NOT Instagram which requires images)
// Set BUFFER_TEXT_CHANNEL_IDS env var to override (comma-separated)
const TEXT_CHANNEL_IDS = process.env.BUFFER_TEXT_CHANNEL_IDS
  ? process.env.BUFFER_TEXT_CHANNEL_IDS.split(",").map(id => id.trim()).filter(Boolean)
  : ["692a863b29ea336fd63c647f"]; // Facebook only as default (Instagram needs images)

if (!BUFFER_ACCESS_TOKEN) console.warn("[buffer] BUFFER_ACCESS_TOKEN not set — social posting disabled");
if (!BUFFER_ORG_ID) console.warn("[buffer] BUFFER_ORG_ID not set — cannot fetch channels");

// Channel IDs cache (fetched once, reused)
let channelIdsCache: string[] | null = null;

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
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[buffer] GraphQL HTTP error:", res.status, text);
    return { errors: [{ message: `HTTP ${res.status}: ${text}` }] };
  }

  return res.json();
}

/**
 * Fetch all channel IDs from Buffer (cached after first call).
 */
async function getChannelIds(): Promise<string[]> {
  if (channelIdsCache) return channelIdsCache;

  // If explicit channel IDs are set, use those
  const explicitIds = process.env.BUFFER_CHANNEL_IDS;
  if (explicitIds) {
    channelIdsCache = explicitIds.split(",").map((id) => id.trim()).filter(Boolean);
    return channelIdsCache;
  }

  // Otherwise fetch from Buffer API
  if (!BUFFER_ORG_ID) {
    console.warn("[buffer] No BUFFER_ORG_ID or BUFFER_CHANNEL_IDS set — using known channel IDs");
    channelIdsCache = [...KNOWN_CHANNEL_IDS];
    return channelIdsCache;
  }

  const result = await bufferGraphQL(`
    query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id
        name
        service
      }
    }
  `, { orgId: BUFFER_ORG_ID });

  if (result.errors) {
    console.error("[buffer] Failed to fetch channels:", result.errors[0].message, "— using known channel IDs");
    channelIdsCache = [...KNOWN_CHANNEL_IDS];
    return channelIdsCache;
  }

  const channels = (result.data?.channels || []) as { id: string; name: string; service: string }[];
  if (channels.length === 0) {
    console.warn("[buffer] API returned 0 channels — using known channel IDs");
    channelIdsCache = [...KNOWN_CHANNEL_IDS];
    return channelIdsCache;
  }

  channelIdsCache = channels.map((ch) => ch.id);
  console.log(`[buffer] Found ${channels.length} channels:`, channels.map((c) => `${c.service}:${c.name}`).join(", "));
  return channelIdsCache;
}

/**
 * Post a text message to all connected Buffer channels.
 * Publishes immediately (mode: shareNow).
 * Returns { ok, error? } — never throws.
 */
export async function postToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  return postToBufferWithMedia(text);
}

/**
 * Post a message with an optional image to all connected Buffer channels.
 * Uses Buffer GraphQL API createPost mutation.
 * Image must be a publicly accessible URL.
 * Publishes immediately (mode: shareNow).
 */
export async function postToBufferWithMedia(
  text: string,
  imageUrl?: string,
  token?: string
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = token || BUFFER_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "Buffer access token not configured" };
  }

  const channelIds = await getChannelIds();
  if (channelIds.length === 0) {
    return { ok: false, error: "No Buffer channels found" };
  }

  console.log(`[buffer] Posting to ${channelIds.length} channels${imageUrl ? " with image" : ""}`);

  let successCount = 0;
  let lastError = "";

  // Post to each channel individually (Buffer GraphQL requires one channel per mutation)
  for (const channelId of channelIds) {
    try {
      const mutation = imageUrl
        ? `mutation CreatePost($text: String!, $channelId: ChannelId!, $imageUrl: String!) {
          createPost(input: {
            text: $text,
            channelId: $channelId,
            schedulingType: automatic,
            mode: shareNow,
            assets: { images: [{ url: $imageUrl }] }
          }) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }`
        : `mutation CreatePost($text: String!, $channelId: ChannelId!) {
          createPost(input: {
            text: $text,
            channelId: $channelId,
            schedulingType: automatic,
            mode: shareNow
          }) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }`;

      const variables: Record<string, unknown> = { text, channelId };
      if (imageUrl) variables.imageUrl = imageUrl;

      const result = await bufferGraphQL(mutation, variables, accessToken);

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

      successCount++;
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

/**
 * Post live commentary to Buffer using the dedicated live commentary token.
 * Uses text-only channels (Twitter, Threads, Facebook — NOT Instagram which requires images).
 * This keeps live content separate from scheduled content in Buffer analytics.
 */
export async function postLiveToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = BUFFER_LIVE_TOKEN || BUFFER_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, error: "Buffer live token not configured" };
  }

  // Use text-only channels to avoid Instagram (which rejects posts without images)
  const channelIds = TEXT_CHANNEL_IDS.length > 0 ? TEXT_CHANNEL_IDS : await getChannelIds();
  if (channelIds.length === 0) {
    return { ok: false, error: "No Buffer text channels configured" };
  }

  console.log(`[buffer-live] Posting to ${channelIds.length} text channels`);

  let successCount = 0;
  let lastError = "";

  for (const channelId of channelIds) {
    try {
      const result = await bufferGraphQL(`
        mutation CreatePost($text: String!, $channelId: ChannelId!) {
          createPost(input: {
            text: $text,
            channelId: $channelId,
            schedulingType: automatic,
            mode: shareNow
          }) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }
      `, { text, channelId }, token);

      if (result.errors) {
        lastError = result.errors[0].message;
        console.error(`[buffer-live] Channel ${channelId} error:`, lastError);
        continue;
      }

      const payload = result.data?.createPost as Record<string, unknown> | undefined;
      if (payload?.message) {
        lastError = String(payload.message);
        console.error(`[buffer-live] Channel ${channelId} mutation error:`, lastError);
        continue;
      }

      successCount++;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[buffer-live] Channel ${channelId} failed:`, lastError);
    }
  }

  if (successCount > 0) {
    console.log(`[buffer-live] Posted to ${successCount}/${channelIds.length} channels`);
    return { ok: true };
  }

  return { ok: false, error: lastError || "All text channels failed" };
}

/**
 * Clear the channel IDs cache (useful if channels are added/removed).
 */
export function clearChannelCache(): void {
  channelIdsCache = null;
}
