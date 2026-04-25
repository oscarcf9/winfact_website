/**
 * Lightweight in-memory rate limiter for admin endpoints that spend money
 * (OpenAI image gen, Anthropic generation). Per-warm-instance, per-key,
 * sliding-window. Prevents accidental click-spam from racking up cost.
 *
 * Returns { ok: true } when allowed, { ok: false, retryAfterMs } when blocked.
 *
 * Usage:
 *   const limited = checkAdminRateLimit("backfill-blog-images", 60_000);
 *   if (!limited.ok) return NextResponse.json({...}, { status: 429 });
 */

type Window = { firstHitAt: number; count: number };
const buckets = new Map<string, Window>();

export function checkAdminRateLimit(
  key: string,
  windowMs: number,
  maxHits: number = 1
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const w = buckets.get(key);

  if (!w || now - w.firstHitAt > windowMs) {
    buckets.set(key, { firstHitAt: now, count: 1 });
    return { ok: true };
  }

  if (w.count < maxHits) {
    w.count += 1;
    return { ok: true };
  }

  return { ok: false, retryAfterMs: windowMs - (now - w.firstHitAt) };
}

export function rateLimitResponse(retryAfterMs: number) {
  return Response.json(
    {
      error: "rate_limited",
      message: "This endpoint is rate-limited to prevent cost spikes. Try again shortly.",
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}
