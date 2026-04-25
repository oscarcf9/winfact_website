/**
 * Serves the IndexNow ownership key. IndexNow's protocol requires a hosted
 * key file accessible at the URL passed as `keyLocation` in submissions.
 * Returns the env var INDEXNOW_KEY as plain text.
 *
 * Why this path (not the canonical `/<key>.txt`): we use a stable URL so the
 * key can be rotated via env var without breaking the keyLocation URL.
 */

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.INDEXNOW_KEY || "";
  if (!key) {
    return new Response("IndexNow key not configured", { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
