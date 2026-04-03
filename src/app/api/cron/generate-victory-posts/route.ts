import { NextResponse } from "next/server";
import { processNextVictoryPost } from "@/lib/victory-post-pipeline";

/**
 * Cron: Generate victory posts from the pending queue.
 * Processes ONE pending post per invocation to stay within Vercel timeout limits.
 * Schedule: every 15 minutes (or more frequently if desired).
 *
 * The auto-settler and admin panel write "pending" rows to victory_posts.
 * This cron picks them up and does the heavy work (gpt-image-1, compositing, etc).
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
    const processed = await processNextVictoryPost();

    if (processed) {
      return NextResponse.json({ message: "Processed one victory post" });
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
