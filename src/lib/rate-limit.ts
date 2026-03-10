import { NextRequest } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs?: number; // sliding window in ms (default: 60_000 = 60s)
  maxRequests?: number; // max requests per window (default: 30)
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove timestamps older than the largest reasonable window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs * 2);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow the process to exit without waiting for this interval
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Extract the client IP from a Next.js request.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * In-memory sliding window rate limiter.
 *
 * Usage:
 *   const { success, remaining } = rateLimit(req);
 *   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */
export function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): RateLimitResult {
  const { windowMs = 60_000, maxRequests = 30 } = config;

  ensureCleanup(windowMs);

  const ip = getClientIp(req);
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    return {
      success: false,
      remaining: 0,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
  };
}
