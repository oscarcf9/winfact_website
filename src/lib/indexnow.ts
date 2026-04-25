/**
 * IndexNow protocol — instant URL submission to Bing, Yandex, and (via
 * partnership) DuckDuckGo / Seznam. Google does NOT participate but still
 * crawls faster when these other engines pick up the URL via cross-network
 * signals.
 *
 * One-time setup:
 *   1. Set INDEXNOW_KEY env var to a 32+ char hex string (e.g. crypto.randomUUID().replace(/-/g, "")+ "1234abcd").
 *   2. Host the key file at /<INDEXNOW_KEY>.txt with the key as plain content.
 *      (See src/app/[key].txt or static route.)
 *
 * No-op if INDEXNOW_KEY is missing — safe to call from any publish path.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

/**
 * Submit one or more URLs to IndexNow. Fire-and-forget — never throws.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!INDEXNOW_KEY) return;
  const filtered = urls.filter((u) => u && u.startsWith("http"));
  if (filtered.length === 0) return;

  const host = new URL(SITE_URL).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    // Stable key-file location served by /api/indexnow/key (returns the
    // env value as plain text). This lets us rotate INDEXNOW_KEY without
    // also having to deploy a renamed static file.
    keyLocation: `${SITE_URL}/api/indexnow/key`,
    urlList: filtered,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[indexnow] submission failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
      return;
    }
    console.log(`[indexnow] submitted ${filtered.length} URL(s)`);
  } catch (err) {
    console.warn("[indexnow] submission threw:", err);
  }
}

/**
 * Convenience: ping IndexNow for an EN+ES blog pair.
 */
export async function pingIndexNowForBlog(slug: string): Promise<void> {
  await pingIndexNow([
    `${SITE_URL}/en/blog/${slug}`,
    `${SITE_URL}/es/blog/${slug}`,
  ]);
}
