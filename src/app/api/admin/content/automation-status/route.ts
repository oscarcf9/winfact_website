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
    // Fall back to publishedAt when createdAt is null — matches what the blog list shows.
    db
      .select({ createdAt: posts.createdAt, publishedAt: posts.publishedAt })
      .from(posts)
      .where(or(eq(posts.status, "draft"), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt))
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

  // Effective state: env var overrides the admin toggle.
  // Currently only blog_auto_generator has an env var override (ENABLE_AUTO_BLOG).
  const envAutoBlog = process.env.ENABLE_AUTO_BLOG;
  const effectiveState = {
    blog_auto_generator:
      envAutoBlog === "true" || envAutoBlog === "false"
        ? { value: envAutoBlog, source: "env:ENABLE_AUTO_BLOG" as const }
        : { value: toggles.blog_auto_generator, source: "site_content" as const },
    live_commentary_enabled: {
      value: toggles.live_commentary_enabled,
      source: "site_content" as const,
    },
    filler_content_enabled: {
      value: toggles.filler_content_enabled,
      source: "site_content" as const,
    },
  };

  return NextResponse.json({
    toggles,
    effectiveState,
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
      lastBlog: latestPost[0]?.publishedAt ?? latestPost[0]?.createdAt ?? null,
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
