/**
 * Buffer GraphQL API client.
 * Uses Buffer's createPost mutation to publish content to social channels.
 * Docs: https://developers.buffer.com
 *
 * Channel routing:
 *   - Live commentary → Twitter + Threads ONLY
 *   - Filler posts → Facebook + Instagram + Twitter + Threads
 *   - Victory posts → Facebook + Instagram + Twitter + Threads
 *   - Blog links → Facebook ONLY (handled in social-posting.ts)
 *
 * Observability: every per-channel attempt writes one row to distribution_log
 * with status + latency + Buffer post ID (on success) or error (on failure).
 *
 * Reliability: missing tokens throw BufferConfigError; all-channel failures
 * trigger a deduped Telegram admin alert.
 */

import { db } from "@/db";
import { distributionLog } from "@/db/schema";
import { sendAdminNotification } from "./telegram";

const BUFFER_API = "https://api.buffer.com";
const BUFFER_ORG_ID = process.env.BUFFER_ORG_ID || "68dde1d4ae0ea4e53700e8cf";

const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || "";
const BUFFER_LIVE_TOKEN = process.env.BUFFER_LIVE_TOKEN || "";

const CHANNELS = {
  instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID || "692a85d829ea336fd63c6413",
  facebook: process.env.BUFFER_FACEBOOK_CHANNEL_ID || "692a863b29ea336fd63c647f",
  threads: process.env.BUFFER_THREADS_CHANNEL_ID || "69d01392af47dacb6986f297",
  twitter: process.env.BUFFER_TWITTER_CHANNEL_ID || "69d014acaf47dacb6986f73f",
};

export type ChannelKey = "instagram" | "facebook" | "threads" | "twitter";
const KNOWN_KEYS: ChannelKey[] = ["instagram", "facebook", "threads", "twitter"];

if (!BUFFER_ACCESS_TOKEN) console.warn("[buffer] BUFFER_ACCESS_TOKEN not set — social posting disabled");

// ── Error types ─────────────────────────────────────────────────────────────

export class BufferConfigError extends Error {
  readonly kind = "BufferConfigError" as const;
  constructor(message: string) {
    super(message);
    this.name = "BufferConfigError";
  }
}

// ── Alert dedup (in-memory, per cold start) ─────────────────────────────────

const alertDedup = new Map<string, number>();
const ALERT_DEDUP_MS = 60 * 60 * 1000; // 1 hour

async function alertOnce(key: string, message: string): Promise<void> {
  const last = alertDedup.get(key) ?? 0;
  if (Date.now() - last < ALERT_DEDUP_MS) return;
  alertDedup.set(key, Date.now());
  await sendAdminNotification(message).catch(() => {});
}

export async function alertMissingBufferToken(): Promise<void> {
  await alertOnce(
    "buffer:missing-token",
    "⚠️ <b>Buffer: both BUFFER_LIVE_TOKEN and BUFFER_ACCESS_TOKEN are unset</b>\n\nNo social posts can be published until one is configured in Vercel env."
  );
}

// ── Observability: distribution_log writes ──────────────────────────────────

type DistLogRow = {
  contentType: "commentary" | "filler" | "victory" | "blog" | "test";
  referenceId?: string | null;
  channel: string;
  status: "success" | "failed";
  bufferPostId?: string | null;
  error?: string | null;
  latencyMs: number;
};

async function writeDistributionLog(row: DistLogRow): Promise<void> {
  try {
    await db.insert(distributionLog).values({
      id: crypto.randomUUID(),
      contentType: row.contentType,
      referenceId: row.referenceId ?? null,
      channel: row.channel,
      status: row.status,
      bufferPostId: row.bufferPostId ?? null,
      error: row.error ?? null,
      latencyMs: row.latencyMs,
      createdAt: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    // Don't let a logging failure break the publish path.
    console.error("[buffer] distribution_log write failed:", err);
  }
}

// ── Per-channel text shaping ───────────────────────────────────────────────

/**
 * Twitter / X hard limit is 280 chars. Our filler caption + hashtag block
 * routinely runs 400-800 chars. Strategy:
 *   1. If hashtag block takes us over, drop hashtags entirely (image carries
 *      the discovery signal on X better than hashtags anyway).
 *   2. If the body alone is still > 275, truncate at the nearest word boundary
 *      under 275 and append a single ellipsis.
 */
function truncateForTwitter(text: string): string {
  const MAX = 280;
  if (text.length <= MAX) return text;

  // Everything after a double-newline line that starts with "#" is the
  // hashtag block we append in social-posting.ts.
  const hashtagBlockStart = text.search(/\n\n#[A-Za-z0-9_]/);
  const body = hashtagBlockStart >= 0 ? text.slice(0, hashtagBlockStart).trimEnd() : text;

  if (body.length <= MAX) return body;

  const hardCap = 275;
  const truncated = body.slice(0, hardCap);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > 200 ? truncated.slice(0, lastSpace) : truncated;
  return `${base}...`;
}

// ── Channel-key/id helpers ─────────────────────────────────────────────────

function idToKey(channelId: string): ChannelKey | null {
  for (const k of KNOWN_KEYS) {
    if (CHANNELS[k] === channelId) return k;
  }
  return null;
}

function keyToId(key: ChannelKey): string | null {
  return CHANNELS[key] || null;
}

// ── Result types ────────────────────────────────────────────────────────────

export type PerChannelResult = {
  key: ChannelKey | null;
  id: string;
  success: boolean;
  error?: string;
  bufferPostId?: string;
  latencyMs: number;
};

export type PublishResult = {
  ok: boolean; // backwards-compatible: true iff >= 1 channel succeeded
  error?: string;
  allSucceeded: boolean;
  someSucceeded: boolean;
  channels: PerChannelResult[];
  failedChannels: ChannelKey[];
};

// ── Buffer GraphQL transport ───────────────────────────────────────────────

async function bufferGraphQL(
  query: string,
  variables: Record<string, unknown> | undefined,
  token: string
): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }> {
  if (!token) {
    return { errors: [{ message: "Buffer access token not configured" }] };
  }

  const res = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[buffer] GraphQL HTTP error:", res.status, text.substring(0, 600));
    // Keep more context so distribution_log surfaces the actual GraphQL rejection
    // instead of truncating mid-message (was 200, now 600 chars).
    return { errors: [{ message: `HTTP ${res.status}: ${text.substring(0, 600)}` }] };
  }

  return res.json();
}

// ── Routing ────────────────────────────────────────────────────────────────

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
    // comma-separated channel keys, e.g. "instagram,facebook"
    const keys = route.split(",").map((k) => k.trim().toLowerCase());
    for (const k of keys) {
      const id = (CHANNELS as Record<string, string>)[k];
      if (id) ids.push(id);
    }
  }
  return ids;
}

// ── Core publish ────────────────────────────────────────────────────────────

function buildMutation(args: {
  text: string;
  channelId: string;
  imageUrl?: string;
  publishNow?: boolean;
  facebookId: string;
  instagramId: string;
}): string {
  const assetsBlock = args.imageUrl
    ? `assets: { images: [{ url: ${JSON.stringify(args.imageUrl)} }] }`
    : "";
  // Buffer enum constraints (confirmed via GraphQL error messages):
  //   - SchedulingType enum: only `automatic` is valid. No `custom`, no `immediate`.
  //   - ShareMode enum: `shareNow` | `addToQueue`. No `custom`.
  // There is no `scheduledAt` field on CreatePostInput; time-scheduling is
  // driven entirely by Buffer's account-level posting schedule. On the
  // Essentials plan `shareNow` with media may route through the next queue
  // slot instead of publishing instantly; configure posting slots in Buffer
  // per channel to control wall-clock timing.
  const scheduleBlock = args.publishNow
    ? `schedulingType: automatic, mode: shareNow`
    : `schedulingType: automatic, mode: addToQueue`;
  // Per-channel metadata. Buffer requires Facebook/Instagram posts to declare
  // a `type` (post/story/reel/status). Instagram additionally requires
  // `shouldShareToFeed: true` for feed posts (or else GraphQL rejects with
  // "InstagramPostMetadataInput.shouldShareToFeed of required type Boolean!").
  const metadataParts: string[] = [];
  if (args.channelId === args.facebookId) {
    metadataParts.push("facebook: { type: post }");
  }
  if (args.channelId === args.instagramId) {
    metadataParts.push("instagram: { type: post, shouldShareToFeed: true }");
  }
  const metadataBlock = metadataParts.length
    ? `, metadata: { ${metadataParts.join(", ")} }`
    : "";
  return `
    mutation CreatePost {
      createPost(input: {
        text: ${JSON.stringify(args.text)},
        channelId: "${args.channelId}",
        ${scheduleBlock}
        ${assetsBlock ? `, ${assetsBlock}` : ""}
        ${metadataBlock}
      }) {
        ... on PostActionSuccess {
          post { id text dueAt }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
}

type PublishOpts = {
  token: string;
  publishNow?: boolean;
  contentType: "commentary" | "filler" | "victory" | "blog" | "test";
  referenceId?: string | null;
};

async function publishPost(
  text: string,
  channelIds: string[],
  imageUrl: string | undefined,
  opts: PublishOpts
): Promise<PublishResult> {
  const empty: PublishResult = {
    ok: false,
    allSucceeded: false,
    someSucceeded: false,
    channels: [],
    failedChannels: [],
  };

  if (channelIds.length === 0) {
    return { ...empty, error: "No Buffer channels configured for this route" };
  }

  console.log(
    `[buffer] Publishing to ${channelIds.length} channels${imageUrl ? " with image" : ""}: ${channelIds.join(", ")}`
  );

  const channels: PerChannelResult[] = [];

  for (const channelId of channelIds) {
    const key = idToKey(channelId);
    const channelLabel = key ?? channelId;
    const t0 = Date.now();
    const entry: PerChannelResult = { key, id: channelId, success: false, latencyMs: 0 };

    try {
      // Twitter/X rejects posts > 280 chars. Shrink by dropping trailing
      // hashtag lines first, then truncating mid-sentence if still too long.
      const perChannelText =
        channelId === CHANNELS.twitter && text.length > 280
          ? truncateForTwitter(text)
          : text;

      const mutation = buildMutation({
        text: perChannelText, channelId, imageUrl,
        publishNow: opts.publishNow,
        facebookId: CHANNELS.facebook,
        instagramId: CHANNELS.instagram,
      });
      const result = await bufferGraphQL(mutation, undefined, opts.token);

      if (result.errors) {
        entry.error = result.errors[0].message;
      } else {
        const payload = result.data?.createPost as Record<string, unknown> | undefined;
        if (payload?.message) {
          entry.error = String(payload.message);
        } else {
          const post = payload?.post as Record<string, unknown> | undefined;
          if (post?.id) {
            entry.success = true;
            entry.bufferPostId = String(post.id);
          } else {
            // No error but no post ID — log full response; treat as success to avoid retry storms.
            console.warn(`[buffer] Channel ${channelLabel} — unexpected response:`, JSON.stringify(result.data));
            entry.success = true;
          }
        }
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
    }

    entry.latencyMs = Date.now() - t0;
    if (entry.success) {
      console.log(`[buffer] Channel ${channelLabel} → Post ${entry.bufferPostId ?? "(no id)"} in ${entry.latencyMs}ms`);
    } else {
      console.error(`[buffer] Channel ${channelLabel} failed (${entry.latencyMs}ms):`, entry.error);
    }

    // Observability: one row per channel attempt
    writeDistributionLog({
      contentType: opts.contentType,
      referenceId: opts.referenceId ?? null,
      channel: channelLabel,
      status: entry.success ? "success" : "failed",
      bufferPostId: entry.bufferPostId ?? null,
      error: entry.error ?? null,
      latencyMs: entry.latencyMs,
    }).catch(() => {});

    channels.push(entry);
  }

  const successCount = channels.filter((c) => c.success).length;
  const failedChannels = channels
    .filter((c) => !c.success)
    .map((c) => c.key)
    .filter((k): k is ChannelKey => k !== null);
  const firstError = channels.find((c) => !c.success && c.error)?.error;

  console.log(`[buffer] Published to ${successCount}/${channels.length} channels`);

  const result: PublishResult = {
    ok: successCount > 0,
    error: successCount === 0 ? (firstError || "All channels failed") : undefined,
    allSucceeded: successCount === channels.length,
    someSucceeded: successCount > 0,
    channels,
    failedChannels,
  };

  // All-channel failure → deduped Telegram alert (1/hour per cold start)
  if (!result.someSucceeded && channels.length > 0) {
    alertOnce(
      `buffer:all-failed:${opts.contentType}`,
      `⚠️ <b>Buffer: ALL ${channels.length} channels failed</b>\n\nContent type: ${opts.contentType}\nFirst error: ${firstError || "unknown"}\nChannels tried: ${channels.map((c) => c.key ?? c.id).join(", ")}`
    ).catch(() => {});
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────────────

function requireToken(preferred?: string): string {
  const t = preferred || BUFFER_ACCESS_TOKEN;
  if (!t) {
    alertMissingBufferToken().catch(() => {});
    throw new BufferConfigError(
      "Buffer token not configured. Set BUFFER_ACCESS_TOKEN (or BUFFER_LIVE_TOKEN for live commentary)."
    );
  }
  return t;
}

/**
 * Publish to all channels (or a route preset / comma-separated subset).
 * Throws BufferConfigError if token is missing.
 *
 * Uses `mode: shareNow` by default — our process-content-queue cron already
 * controls timing (respecting random filler times + 30-min gaps). If we used
 * `mode: addToQueue` instead, Buffer would hold posts until the account's
 * configured posting schedule slots, which may be empty and keep posts pending
 * indefinitely.
 */
export async function postToBufferWithMedia(
  text: string,
  imageUrl?: string,
  token?: string,
  route: string = "all",
  opts?: { contentType?: PublishOpts["contentType"]; referenceId?: string | null }
): Promise<PublishResult> {
  const resolvedToken = requireToken(token);
  const channels = getChannelsForRoute(route);
  return publishPost(text, channels, imageUrl, {
    token: resolvedToken,
    publishNow: true,
    contentType: opts?.contentType ?? "filler",
    referenceId: opts?.referenceId ?? null,
  });
}

export async function postToBuffer(text: string, opts?: { contentType?: PublishOpts["contentType"]; referenceId?: string | null }): Promise<PublishResult> {
  return postToBufferWithMedia(text, undefined, undefined, "all", opts);
}

/**
 * Post live commentary to Twitter + Threads ONLY, publish immediately.
 * Uses BUFFER_LIVE_TOKEN if set, else falls back to BUFFER_ACCESS_TOKEN.
 * Throws BufferConfigError if no token is configured.
 */
export async function postLiveToBuffer(
  text: string,
  opts?: { referenceId?: string | null }
): Promise<PublishResult> {
  const token = requireToken(BUFFER_LIVE_TOKEN || BUFFER_ACCESS_TOKEN);
  const channels = getChannelsForRoute("text_only");
  if (channels.length === 0) {
    alertOnce(
      "buffer:no-live-channels",
      "⚠️ <b>Buffer: postLiveToBuffer has no channels</b>\n\nSet BUFFER_TWITTER_CHANNEL_ID and/or BUFFER_THREADS_CHANNEL_ID."
    ).catch(() => {});
    return {
      ok: false,
      error: "No Twitter/Threads channels configured.",
      allSucceeded: false,
      someSucceeded: false,
      channels: [],
      failedChannels: [],
    };
  }
  console.log(`[buffer] postLiveToBuffer: publishing NOW to ${channels.length} channels (Twitter/Threads)`);
  return publishPost(text, channels, undefined, {
    token,
    publishNow: true,
    contentType: "commentary",
    referenceId: opts?.referenceId ?? null,
  });
}

/**
 * Post blog link to Facebook ONLY. Uses shareNow so Buffer publishes on call
 * rather than queuing until an empty posting-schedule slot.
 */
export async function postBlogLinkToBuffer(
  text: string,
  imageUrl?: string,
  opts?: { referenceId?: string | null }
): Promise<PublishResult> {
  const token = requireToken();
  const channels = getChannelsForRoute("facebook_only");
  return publishPost(text, channels, imageUrl, {
    token,
    publishNow: true,
    contentType: "blog",
    referenceId: opts?.referenceId ?? null,
  });
}

/**
 * Publish to exactly ONE channel by key. Used by the admin buffer-test route
 * and by the retry cron when it's retrying a single failed channel from a
 * prior multi-channel attempt.
 */
export async function publishToChannel(
  channelKey: ChannelKey,
  text: string,
  imageUrl?: string,
  opts?: {
    publishNow?: boolean;
    contentType?: PublishOpts["contentType"];
    referenceId?: string | null;
    tokenOverride?: string;
  }
): Promise<PerChannelResult> {
  const id = keyToId(channelKey);
  if (!id) {
    return {
      key: channelKey,
      id: "",
      success: false,
      error: `No channel ID configured for ${channelKey}`,
      latencyMs: 0,
    };
  }
  // Twitter/Threads prefer the live token; others use access token.
  const preferred =
    channelKey === "twitter" || channelKey === "threads"
      ? opts?.tokenOverride || BUFFER_LIVE_TOKEN || BUFFER_ACCESS_TOKEN
      : opts?.tokenOverride || BUFFER_ACCESS_TOKEN;
  const token = requireToken(preferred);

  const result = await publishPost(text, [id], imageUrl, {
    token,
    publishNow: opts?.publishNow ?? (channelKey === "twitter" || channelKey === "threads"),
    contentType: opts?.contentType ?? "test",
    referenceId: opts?.referenceId ?? null,
  });

  // One-channel publish → one channel entry
  return result.channels[0] ?? {
    key: channelKey,
    id,
    success: false,
    error: "no channel result returned",
    latencyMs: 0,
  };
}

/**
 * Query Buffer account to verify channel IDs and organization.
 */
export async function verifyBufferChannels(token?: string): Promise<{
  ok: boolean;
  channels?: { id: string; name: string; service: string }[];
  error?: string;
}> {
  const t = token || BUFFER_ACCESS_TOKEN;
  if (!t) return { ok: false, error: "Buffer token not configured" };
  const query = `
    query {
      account {
        organizations {
          id
          channels { id name service }
        }
      }
    }
  `;
  const result = await bufferGraphQL(query, undefined, t);
  if (result.errors) return { ok: false, error: result.errors[0].message };
  const account = result.data?.account as Record<string, unknown> | undefined;
  const orgs = account?.organizations as { id: string; channels: { id: string; name: string; service: string }[] }[] | undefined;
  if (!orgs || orgs.length === 0) return { ok: false, error: "No organizations found" };
  const org = orgs.find((o) => o.id === BUFFER_ORG_ID) || orgs[0];
  return { ok: true, channels: org.channels };
}

export function clearChannelCache(): void {
  // No-op — channels are now config-based, no cache to clear.
}
