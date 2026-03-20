import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
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

    // Find all scheduled posts whose publishedAt time has passed
    const scheduledPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.status, "scheduled"),
          lte(posts.publishedAt, now)
        )
      );

    const published: { id: string; slug: string; title: string }[] = [];

    for (const post of scheduledPosts) {
      await db
        .update(posts)
        .set({ status: "published", updatedAt: now })
        .where(eq(posts.id, post.id));

      published.push({ id: post.id, slug: post.slug, title: post.titleEn });
    }

    return NextResponse.json({
      ok: true,
      published: published.length,
      posts: published,
    });
  } catch (error) {
    console.error("Scheduled publish cron failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
