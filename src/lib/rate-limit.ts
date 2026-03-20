import { NextRequest } from "next/server";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";

interface RateLimitConfig {
  windowMs?: number; // fixed window in ms (default: 60_000 = 60s)
  maxRequests?: number; // max requests per window (default: 30)
  prefix?: string; // key prefix for namespace (default: "global")
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Extract the client IP from a Next.js request.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Turso-backed fixed-window rate limiter.
 * Works correctly on Vercel serverless (no shared in-memory state needed).
 *
 * Uses INSERT ... ON CONFLICT to atomically increment counters.
 *
 * Usage:
 *   const { success } = await rateLimit(req, { prefix: "checkout", maxRequests: 5, windowMs: 60_000 });
 *   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const { windowMs = 60_000, maxRequests = 30, prefix = "global" } = config;

  const ip = getClientIp(req);
  const windowSec = Math.floor(windowMs / 1000);
  const currentWindow = Math.floor(Date.now() / 1000 / windowSec) * windowSec;

  const key = `${prefix}:${ip}`;
  const id = `${key}:${currentWindow}`;

  try {
    // Atomic upsert: insert or increment counter
    await db.run(
      sql`INSERT INTO rate_limits (id, key, window_start, count)
          VALUES (${id}, ${key}, ${currentWindow}, 1)
          ON CONFLICT(id) DO UPDATE SET count = count + 1`
    );

    // Read current count
    const [row] = await db
      .select({ count: rateLimits.count })
      .from(rateLimits)
      .where(eq(rateLimits.id, id))
      .limit(1);

    const count = row?.count ?? 1;

    if (count > maxRequests) {
      return { success: false, remaining: 0 };
    }

    return { success: true, remaining: maxRequests - count };
  } catch (error) {
    // If rate limiting fails (DB issue), allow the request through
    // rather than blocking legitimate users
    console.error("Rate limit check failed:", error);
    return { success: true, remaining: maxRequests };
  }
}

/**
 * Clean up expired rate limit entries.
 * Call from a cron job periodically (e.g. every hour).
 */
export async function cleanupRateLimits(): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - 3600; // older than 1 hour
  const result = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, cutoff));
  return result.rowsAffected;
}
