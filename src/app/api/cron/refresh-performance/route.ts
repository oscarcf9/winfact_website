import { NextResponse } from "next/server";
import { refreshPerformanceCache } from "@/lib/refresh-performance";
import { sendAdminNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/refresh-performance
 *
 * Scheduled every 15 minutes (vercel.json). Rebuilds performance_cache from
 * settled picks so the /admin/performance page is never stale by more than
 * ~20 minutes (15 min cron + 5 min grace).
 *
 * Defense-in-depth alongside settle-time refreshes — catches manual result
 * corrections, bulk imports that bypassed the hook, and any cron failures
 * upstream that left the cache dirty.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const computedAt = new Date().toISOString();

  try {
    await refreshPerformanceCache();
    const durationMs = Date.now() - startedAt;
    console.log(
      `[cron/refresh-performance] ok in ${durationMs}ms computedAt=${computedAt}`
    );
    return NextResponse.json({ ok: true, durationMs, computedAt });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[cron/refresh-performance] FAILED:", err);
    sendAdminNotification(
      `⚠️ <b>Performance cache refresh failed</b>\n\nRoute: /api/cron/refresh-performance\nError: ${errorMsg}`
    ).catch(() => {});
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
