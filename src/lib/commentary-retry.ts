import { db } from "@/db";
import { commentaryRetryQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ChannelKey } from "./buffer";

/**
 * Exponential backoff for the retry cron: attempt 1 → 5 min, 2 → 15 min,
 * 3 → 45 min. If retryCount >= MAX_RETRIES at failure time, mark permanent.
 */
export const MAX_RETRIES = 3;
const BACKOFF_MINUTES = [5, 15, 45];

export function computeNextRetryAt(retryCount: number): number {
  const idx = Math.min(retryCount, BACKOFF_MINUTES.length - 1);
  return Math.floor(Date.now() / 1000) + BACKOFF_MINUTES[idx] * 60;
}

/**
 * Enqueue a retry row for a single channel that failed mid-distribution.
 * One row per failed channel — each retries independently so a flaky
 * Twitter API doesn't also re-post to Threads where the first attempt worked.
 */
export async function enqueueCommentaryRetry(input: {
  originalLogId: string | null;
  failedChannel: ChannelKey;
  messageText: string;
  mediaUrl?: string | null;
  lastError?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(commentaryRetryQueue).values({
    id,
    originalLogId: input.originalLogId,
    failedChannel: input.failedChannel,
    messageText: input.messageText,
    mediaUrl: input.mediaUrl ?? null,
    retryCount: 0,
    nextRetryAt: computeNextRetryAt(0),
    status: "pending",
    lastError: input.lastError ?? null,
    createdAt: now,
    updatedAt: now,
  });

  console.log(
    `[retry] enqueued ${id} (channel=${input.failedChannel}, original=${input.originalLogId ?? "n/a"})`
  );
  return id;
}

/**
 * Mark a retry row as succeeded. Used by the retry cron after a successful
 * publishToChannel().
 */
export async function markRetrySucceeded(id: string): Promise<void> {
  await db
    .update(commentaryRetryQueue)
    .set({ status: "succeeded", updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(commentaryRetryQueue.id, id));
}

/**
 * Record a retry attempt that failed. Bumps retryCount + schedules next
 * attempt using the backoff table, OR marks permanent if MAX_RETRIES reached.
 * Returns true if the row is now permanent (caller may alert).
 */
export async function markRetryFailedAttempt(
  id: string,
  retryCount: number,
  error: string
): Promise<{ permanent: boolean; nextRetryAt: number | null }> {
  const now = Math.floor(Date.now() / 1000);
  const newCount = retryCount + 1;
  if (newCount >= MAX_RETRIES) {
    await db
      .update(commentaryRetryQueue)
      .set({
        status: "failed_permanent",
        retryCount: newCount,
        lastError: error,
        updatedAt: now,
      })
      .where(eq(commentaryRetryQueue.id, id));
    return { permanent: true, nextRetryAt: null };
  }
  const nextAt = computeNextRetryAt(newCount);
  await db
    .update(commentaryRetryQueue)
    .set({
      retryCount: newCount,
      nextRetryAt: nextAt,
      lastError: error,
      updatedAt: now,
    })
    .where(eq(commentaryRetryQueue.id, id));
  return { permanent: false, nextRetryAt: nextAt };
}
