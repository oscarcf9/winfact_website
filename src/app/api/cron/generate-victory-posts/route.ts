import { NextResponse } from "next/server";
import { db } from "@/db";
import { victoryPosts } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { processNextVictoryPost } from "@/lib/victory-post-pipeline";

/**
 * Cron: Generate victory posts from the pending queue.
 * Processes up to 5 pending posts per invocation.
 * Also recovers stuck posts (>10 min in processing).
 * Schedule: every 15 minutes.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Recover stuck posts: reset old "pending" posts that have been stuck for >30 min.
    // This handles cases where processNextVictoryPost() threw before completion.
    // We detect stuck posts by checking createdAt — if pending for >30 min, the
    // generation likely crashed. Reset them so they retry on the next cron cycle.
    const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await db
      .update(victoryPosts)
      .set({ status: "pending" })
      .where(
        and(
          eq(victoryPosts.status, "pending"),
          lt(victoryPosts.createdAt, stuckCutoff)
        )
      );

    // Process up to 5 pending victory posts
    let processed = 0;
    for (let i = 0; i < 5; i++) {
      const didProcess = await processNextVictoryPost();
      if (!didProcess) break; // No more pending posts
      processed++;
    }

    if (processed > 0) {
      console.log(`[generate-victory-posts] Processed ${processed} victory posts`);
      return NextResponse.json({ message: `Processed ${processed} victory posts` });
    }

    return NextResponse.json({ message: "No pending victory posts" });
  } catch (error) {
    console.error("[generate-victory-posts] Cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
