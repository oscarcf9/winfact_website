/**
 * Buffer API client for cross-posting to Twitter/X and Threads.
 * Uses Buffer REST API v1: https://api.bufferapp.com/1/
 * Fire-and-forget — failures are logged but never throw.
 */

const BUFFER_API = "https://api.bufferapp.com/1";

/**
 * Post a message to all configured Buffer channels (Twitter/X, Threads).
 * Publishes immediately (now=true).
 * Returns { ok, error? } — never throws.
 */
export async function postToBuffer(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const profileIds = process.env.BUFFER_PROFILE_IDS;

  if (!token || !profileIds) {
    return { ok: false, error: "Buffer not configured" };
  }

  const ids = profileIds.split(",").map((id) => id.trim()).filter(Boolean);
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
      return { ok: true };
    }

    return { ok: false, error: data.message || "Unknown Buffer error" };
  } catch (error) {
    console.error("[buffer] Request failed:", error);
    return { ok: false, error: String(error) };
  }
}
