import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { distributionLog, contentQueue, posts } from "@/db/schema";
import { desc, eq, sql, and, isNotNull } from "drizzle-orm";

/**
 * Distribution diagnostics endpoint — surfaces the data Oscar needs to triage
 * "why isn't X posting?". Pulls:
 *   - per-channel × content-type success/failure counts for the last 7 days
 *   - last 10 distribution_log rows per channel
 *   - last 10 content_queue failures (with error text)
 *   - counts of recent posts with vs. without featuredImage
 *   - most-recent per-channel success time (so we can see "Instagram: last OK 17d ago")
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const sevenDaysAgoSec = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  const [
    perChannelTotals,
    recentFailures,
    recentSuccesses,
    recentQueueFailures,
    postsWithImages,
    postsWithoutImages,
    lastSuccessPerChannel,
    instagramFailures,
    facebookFailures,
  ] = await Promise.all([
    // Per-channel × per-status counts (last 7 days)
    db
      .select({
        channel: distributionLog.channel,
        contentType: distributionLog.contentType,
        status: distributionLog.status,
        count: sql<number>`count(*)`,
      })
      .from(distributionLog)
      .where(sql`${distributionLog.createdAt} >= ${sevenDaysAgoSec}`)
      .groupBy(distributionLog.channel, distributionLog.contentType, distributionLog.status),

    // Most recent 20 failures with error text
    db
      .select({
        id: distributionLog.id,
        channel: distributionLog.channel,
        contentType: distributionLog.contentType,
        error: distributionLog.error,
        createdAt: distributionLog.createdAt,
        latencyMs: distributionLog.latencyMs,
      })
      .from(distributionLog)
      .where(eq(distributionLog.status, "failed"))
      .orderBy(desc(distributionLog.createdAt))
      .limit(20),

    // Most recent 20 successes (sanity check)
    db
      .select({
        id: distributionLog.id,
        channel: distributionLog.channel,
        contentType: distributionLog.contentType,
        bufferPostId: distributionLog.bufferPostId,
        createdAt: distributionLog.createdAt,
      })
      .from(distributionLog)
      .where(eq(distributionLog.status, "success"))
      .orderBy(desc(distributionLog.createdAt))
      .limit(20),

    // Failed content_queue items (last 20)
    db
      .select({
        id: contentQueue.id,
        type: contentQueue.type,
        title: contentQueue.title,
        imageUrl: contentQueue.imageUrl,
        error: contentQueue.error,
        createdAt: contentQueue.createdAt,
      })
      .from(contentQueue)
      .where(eq(contentQueue.status, "failed"))
      .orderBy(desc(contentQueue.createdAt))
      .limit(20),

    // Posts with hero image
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.status, "published"), isNotNull(posts.featuredImage))),

    // Posts without hero image
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.status, "published"), sql`${posts.featuredImage} IS NULL`)),

    // Last success timestamp per channel (all time)
    db
      .select({
        channel: distributionLog.channel,
        lastSuccessAt: sql<number>`max(${distributionLog.createdAt})`,
      })
      .from(distributionLog)
      .where(eq(distributionLog.status, "success"))
      .groupBy(distributionLog.channel),

    // Last 10 Instagram failures with full error (these hide behind commentary spam)
    db
      .select({
        id: distributionLog.id,
        channel: distributionLog.channel,
        contentType: distributionLog.contentType,
        error: distributionLog.error,
        createdAt: distributionLog.createdAt,
      })
      .from(distributionLog)
      .where(and(eq(distributionLog.status, "failed"), eq(distributionLog.channel, "instagram")))
      .orderBy(desc(distributionLog.createdAt))
      .limit(10),

    // Last 10 Facebook failures
    db
      .select({
        id: distributionLog.id,
        channel: distributionLog.channel,
        contentType: distributionLog.contentType,
        error: distributionLog.error,
        createdAt: distributionLog.createdAt,
      })
      .from(distributionLog)
      .where(and(eq(distributionLog.status, "failed"), eq(distributionLog.channel, "facebook")))
      .orderBy(desc(distributionLog.createdAt))
      .limit(10),
  ]);

  // Reshape perChannelTotals into { channel: { success: N, failed: N, byContentType: {...} } }
  const channelSummary: Record<
    string,
    { success: number; failed: number; byContentType: Record<string, { success: number; failed: number }> }
  > = {};
  for (const row of perChannelTotals) {
    const ch = row.channel;
    if (!channelSummary[ch]) {
      channelSummary[ch] = { success: 0, failed: 0, byContentType: {} };
    }
    const n = Number(row.count);
    channelSummary[ch][row.status === "success" ? "success" : "failed"] += n;
    if (!channelSummary[ch].byContentType[row.contentType]) {
      channelSummary[ch].byContentType[row.contentType] = { success: 0, failed: 0 };
    }
    channelSummary[ch].byContentType[row.contentType][row.status === "success" ? "success" : "failed"] += n;
  }

  const lastSuccessMap: Record<string, string | null> = {};
  for (const row of lastSuccessPerChannel) {
    lastSuccessMap[row.channel] = row.lastSuccessAt
      ? new Date(row.lastSuccessAt * 1000).toISOString()
      : null;
  }

  return NextResponse.json({
    window: { days: 7, sinceUnixSec: sevenDaysAgoSec },
    channelSummary,
    lastSuccessPerChannel: lastSuccessMap,
    recentFailures: recentFailures.map((r) => ({
      ...r,
      createdAtIso: r.createdAt ? new Date(r.createdAt * 1000).toISOString() : null,
    })),
    recentSuccesses: recentSuccesses.map((r) => ({
      ...r,
      createdAtIso: r.createdAt ? new Date(r.createdAt * 1000).toISOString() : null,
    })),
    recentQueueFailures,
    failuresByChannel: {
      instagram: instagramFailures.map((r) => ({
        ...r,
        createdAtIso: r.createdAt ? new Date(r.createdAt * 1000).toISOString() : null,
      })),
      facebook: facebookFailures.map((r) => ({
        ...r,
        createdAtIso: r.createdAt ? new Date(r.createdAt * 1000).toISOString() : null,
      })),
    },
    blogImageCoverage: {
      withImage: Number(postsWithImages[0]?.count ?? 0),
      withoutImage: Number(postsWithoutImages[0]?.count ?? 0),
    },
  });
}
