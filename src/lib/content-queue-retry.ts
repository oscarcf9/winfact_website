import { db } from "@/db";
import { contentQueue } from "@/db/schema";
import type { ChannelKey } from "./buffer";

export const MAX_RETRIES = 2;

/**
 * When a row partially succeeds (some channels posted, some failed), enqueue
 * a new row targeting ONLY the failed channels so they retry without
 * re-posting to channels that already succeeded.
 *
 * Capped at MAX_RETRIES attempts per original row.
 */
export async function enqueueRetryForFailedChannels(
  originalRow: typeof contentQueue.$inferSelect,
  failedChannels: ChannelKey[]
): Promise<{ enqueued: boolean; reason?: string; retryId?: string }> {
  if (failedChannels.length === 0) {
    return { enqueued: false, reason: "no_failed_channels" };
  }

  const retryCount = (originalRow.retryCount ?? 0) + 1;
  if (retryCount > MAX_RETRIES) {
    console.warn(
      `[queue-retry] row ${originalRow.id} exceeded max retries (${MAX_RETRIES}); failed channels: ${failedChannels.join(",")}`
    );
    return { enqueued: false, reason: "max_retries_exceeded" };
  }

  // Retry in 5 minutes (gives whatever Buffer-side issue time to settle).
  const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const retryId = crypto.randomUUID();

  await db.insert(contentQueue).values({
    id: retryId,
    type: originalRow.type,
    referenceId: originalRow.referenceId,
    title: originalRow.title,
    preview: originalRow.preview,
    imageUrl: originalRow.imageUrl,
    captionEn: originalRow.captionEn,
    captionEs: originalRow.captionEs,
    hashtags: originalRow.hashtags,
    platform: failedChannels.join(","), // comma-separated channel keys, resolved by getChannelsForRoute
    status: "scheduled",
    scheduledAt: retryAt,
    retryCount,
  });

  console.log(
    `[queue-retry] enqueued retry ${retryId} for original ${originalRow.id} (attempt ${retryCount}/${MAX_RETRIES}, channels: ${failedChannels.join(",")})`
  );

  return { enqueued: true, retryId };
}
