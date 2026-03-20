import { NextResponse } from "next/server";
import { processDeliveryQueue } from "@/lib/delivery";
import { cleanupRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { processedEvents } from "@/db/schema";
import { lt } from "drizzle-orm";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDeliveryQueue();

    // Housekeeping: clean up stale rate limit entries and processed events
    const rateLimitsCleaned = await cleanupRateLimits().catch(() => 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const eventsCleaned = await db
      .delete(processedEvents)
      .where(lt(processedEvents.processedAt, sevenDaysAgo))
      .then((r) => r.rowsAffected)
      .catch(() => 0);

    return NextResponse.json({ ...result, rateLimitsCleaned, eventsCleaned });
  } catch (error) {
    console.error("Delivery queue cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
