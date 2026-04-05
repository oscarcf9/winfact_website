/**
 * Buffer API client for cross-posting to Twitter/X, Threads, Instagram, Facebook.
 * Uses Buffer REST API v1: https://api.bufferapp.com/1/
 * Supports text-only posts and posts with images (via media[photo] URL).
 * Fire-and-forget — failures are logged but never throw.
 */

const BUFFER_API = "https://api.bufferapp.com/1";

if (!process.env.BUFFER_ACCESS_TOKEN) console.warn("[buffer] BUFFER_ACCESS_TOKEN not set — social posting disabled");
if (!process.env.BUFFER_PROFILE_IDS) console.warn("[buffer] BUFFER_PROFILE_IDS not set — no profiles to post to");

/**
 * Post a text message to all configured Buffer channels.
 * Publishes immediately (now=true).
 * Returns { ok, error? } — never throws.
 */
export async function postToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  return postToBufferWithMedia(text);
}

/**
 * Post a message with an optional image to all configured Buffer channels.
 * Buffer API v1 supports attaching images via media[photo] (a public URL).
 * The image URL must be publicly accessible (e.g., R2 or CDN URL).
 * Publishes immediately (now=true).
 */
export async function postToBufferWithMedia(
  text: string,
  imageUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const profileIds = process.env.BUFFER_PROFILE_IDS;

  if (!token || !profileIds) {
    console.log(`[buffer] Not configured: token=${!!token}, profileIds=${!!profileIds}`);
    return { ok: false, error: "Buffer not configured" };
  }

  const ids = profileIds.split(",").map((id) => id.trim()).filter(Boolean);
  console.log(`[buffer] Posting to ${ids.length} profiles${imageUrl ? " with image" : ""}: ${ids.join(", ")}`);
  if (ids.length === 0) {
    return { ok: false, error: "No Buffer profile IDs configured" };
  }

  try {
    // Buffer v1 API expects application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append("text", text);
    params.append("now", "true");
    for (const id of ids) {
      params.append("profile_ids[]", id);
    }

    // Attach image if provided — Buffer v1 supports media[photo] as a URL
    if (imageUrl) {
      params.append("media[photo]", imageUrl);
    }

    const response = await fetch(`${BUFFER_API}/updates/create.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[buffer] API error:", response.status, errorText);
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    if (data.success) {
      console.log("[buffer] Posted successfully");
      return { ok: true };
    }

    return { ok: false, error: data.message || "Unknown Buffer error" };
  } catch (error) {
    console.error("[buffer] Request failed:", error);
    return { ok: false, error: String(error) };
  }
}
