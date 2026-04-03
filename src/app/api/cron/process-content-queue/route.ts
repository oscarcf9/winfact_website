import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";

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
    const now = new Date().toISOString();

    const due = await db
      .select()
      .from(contentQueue)
      .where(
        and(
          eq(contentQueue.status, "scheduled"),
          lte(contentQueue.scheduledAt, now)
        )
      );

    let posted = 0;
    let failed = 0;

    for (const item of due) {
      try {
        if (item.type === "blog") {
          await db
            .update(posts)
            .set({ status: "published", publishedAt: now })
            .where(eq(posts.id, item.referenceId));
        }
        // victory_post and filler types: the queue item status change
        // is the action — extend here when social posting is wired up.

        await db
          .update(contentQueue)
          .set({ status: "posted", postedAt: now })
          .where(eq(contentQueue.id, item.id));

        posted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[content-queue] Failed to process item ${item.id}:`, message);

        await db
          .update(contentQueue)
          .set({ status: "failed", error: message })
          .where(eq(contentQueue.id, item.id));

        failed++;
      }
    }

    return NextResponse.json({ processed: due.length, posted, failed });
  } catch (error) {
    console.error("Content queue cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
