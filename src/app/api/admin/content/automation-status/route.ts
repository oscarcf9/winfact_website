import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, victoryPosts, commentaryLog } from "@/db/schema";
import { desc, or, eq } from "drizzle-orm";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const [latestPost, latestVictory, latestCommentary] = await Promise.all([
    db
      .select({ createdAt: posts.createdAt })
      .from(posts)
      .where(or(eq(posts.status, "draft"), eq(posts.status, "published")))
      .orderBy(desc(posts.createdAt))
      .limit(1),
    db
      .select({ createdAt: victoryPosts.createdAt })
      .from(victoryPosts)
      .orderBy(desc(victoryPosts.createdAt))
      .limit(1),
    db
      .select({ postedAt: commentaryLog.postedAt })
      .from(commentaryLog)
      .orderBy(desc(commentaryLog.postedAt))
      .limit(1),
  ]);

  return NextResponse.json({
    lastBlog: latestPost[0]?.createdAt ?? null,
    lastVictoryPost: latestVictory[0]?.createdAt ?? null,
    lastCommentary: latestCommentary[0]
      ? new Date(latestCommentary[0].postedAt * 1000).toISOString()
      : null,
  });
}
