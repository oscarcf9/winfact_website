import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, victoryPosts, commentaryLog, contentQueue, siteContent } from "@/db/schema";
import { desc, or, eq, and, inArray } from "drizzle-orm";
import { verifyBufferChannels } from "@/lib/buffer";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  // Fetch all toggle states and latest activity in parallel
  const toggleKeys = [
    "filler_content_enabled",
    "live_commentary_enabled",
    "blog_auto_generator",
  ];

  const [latestPost, latestVictory, latestCommentary, toggleRows, recentQueue] = await Promise.all([
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
    db
      .select({ key: siteContent.key, value: siteContent.value })
      .from(siteContent)
      .where(inArray(siteContent.key, toggleKeys)),
    db
      .select({
        id: contentQueue.id,
        type: contentQueue.type,
        status: contentQueue.status,
        title: contentQueue.title,
        imageUrl: contentQueue.imageUrl,
        error: contentQueue.error,
        scheduledAt: contentQueue.scheduledAt,
        postedAt: contentQueue.postedAt,
      })
      .from(contentQueue)
      .orderBy(desc(contentQueue.createdAt))
      .limit(10),
  ]);

  const toggles = Object.fromEntries(toggleKeys.map(k => {
    const row = toggleRows.find(r => r.key === k);
    return [k, row?.value ?? "NOT SET"];
  }));

  return NextResponse.json({
    toggles,
    envCheck: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      BUFFER_ACCESS_TOKEN: !!process.env.BUFFER_ACCESS_TOKEN,
      BUFFER_LIVE_TOKEN: !!process.env.BUFFER_LIVE_TOKEN,
      R2_CONFIGURED: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
      R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
      CRON_SECRET: !!process.env.CRON_SECRET,
      TELEGRAM_FREE_CHAT_ID: !!process.env.TELEGRAM_FREE_CHAT_ID,
      ENABLE_AUTO_BLOG: process.env.ENABLE_AUTO_BLOG || "not set",
    },
    lastActivity: {
      lastBlog: latestPost[0]?.createdAt ?? null,
      lastVictoryPost: latestVictory[0]?.createdAt ?? null,
      lastCommentary: latestCommentary[0]
        ? new Date(latestCommentary[0].postedAt * 1000).toISOString()
        : null,
    },
    recentQueue: recentQueue.map(q => ({
      ...q,
      hasImage: !!q.imageUrl,
    })),
    bufferChannels: await verifyBufferChannels().catch(err => ({
      ok: false,
      error: String(err),
    })),
    bufferConfig: {
      endpoint: "https://api.buffer.com",
      mutation: "createPost (publishes to channels)",
      orgId: process.env.BUFFER_ORG_ID || "68dde1d4ae0ea4e53700e8cf",
      channels: {
        instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID || "692a85d829ea336fd63c6413",
        facebook: process.env.BUFFER_FACEBOOK_CHANNEL_ID || "692a863b29ea336fd63c647f",
        threads: process.env.BUFFER_THREADS_CHANNEL_ID || "69d01392af47dacb6986f297",
        twitter: process.env.BUFFER_TWITTER_CHANNEL_ID || "69d014acaf47dacb6986f73f",
      },
    },
  });
}
