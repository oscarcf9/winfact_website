import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryRetryQueue } from "@/db/schema";
import { and, eq, lte, asc } from "drizzle-orm";
import { publishToChannel, BufferConfigError } from "@/lib/buffer";
import {
  markRetrySucceeded,
  markRetryFailedAttempt,
} from "@/lib/commentary-retry";
import { sendAdminNotification } from "@/lib/telegram";

/**
 * GET /api/cron/retry-failed-distribution
 *
 * Runs every 10 minutes (vercel.json). Picks up pending retry rows whose
 * nextRetryAt has elapsed, attempts the specific failed channel, and either
 * marks the row succeeded OR schedules the next backoff attempt. When
 * retryCount hits MAX_RETRIES, marks permanent + Telegram admin alert.
 *
 * Processes up to MAX_PER_TICK rows per invocation so one stuck batch can't
 * starve other retries.
 */

const MAX_PER_TICK = 5;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    const due = await db
      .select()
      .from(commentaryRetryQueue)
      .where(
        and(
          eq(commentaryRetryQueue.status, "pending"),
          lte(commentaryRetryQueue.nextRetryAt, now)
        )
      )
      .orderBy(asc(commentaryRetryQueue.nextRetryAt))
      .limit(MAX_PER_TICK);

    if (due.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const results: Array<{
      id: string;
      channel: string;
      status: "succeeded" | "retrying" | "permanent" | "skipped";
      error?: string;
    }> = [];

    for (const row of due) {
      try {
        const attempt = await publishToChannel(
          row.failedChannel,
          row.messageText,
          row.mediaUrl ?? undefined,
          {
            contentType: "commentary",
            referenceId: row.originalLogId ?? null,
            publishNow: true,
          }
        );

        if (attempt.success) {
          await markRetrySucceeded(row.id);
          console.log(`[retry] ${row.id} succeeded on channel=${row.failedChannel}`);
          results.push({ id: row.id, channel: row.failedChannel, status: "succeeded" });
          continue;
        }

        const errMsg = attempt.error || "publish returned no success and no error";
        const verdict = await markRetryFailedAttempt(row.id, row.retryCount, errMsg);

        if (verdict.permanent) {
          console.error(`[retry] ${row.id} PERMANENT failure on ${row.failedChannel}: ${errMsg}`);
          sendAdminNotification(
            `⚠️ <b>Commentary distribution: permanent failure</b>\n\nChannel: ${row.failedChannel}\nMessage: ${row.messageText.slice(0, 160)}\nLast error: ${errMsg}\n\nRow: ${row.id}`
          ).catch(() => {});
          results.push({ id: row.id, channel: row.failedChannel, status: "permanent", error: errMsg });
        } else {
          console.log(
            `[retry] ${row.id} failed attempt ${row.retryCount + 1}; next at ${new Date((verdict.nextRetryAt ?? 0) * 1000).toISOString()}`
          );
          results.push({ id: row.id, channel: row.failedChannel, status: "retrying", error: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);

        if (err instanceof BufferConfigError) {
          // Config errors aren't the row's fault — don't count them as a retry.
          // Leave row pending; it'll be picked up again next tick once config is fixed.
          console.error(`[retry] skipping ${row.id} due to BufferConfigError: ${errMsg}`);
          results.push({ id: row.id, channel: row.failedChannel, status: "skipped", error: errMsg });
          continue;
        }

        const verdict = await markRetryFailedAttempt(row.id, row.retryCount, errMsg);
        if (verdict.permanent) {
          sendAdminNotification(
            `⚠️ <b>Commentary distribution: permanent failure (threw)</b>\n\nChannel: ${row.failedChannel}\nError: ${errMsg}\nRow: ${row.id}`
          ).catch(() => {});
          results.push({ id: row.id, channel: row.failedChannel, status: "permanent", error: errMsg });
        } else {
          results.push({ id: row.id, channel: row.failedChannel, status: "retrying", error: errMsg });
        }
      }
    }

    return NextResponse.json({ processed: due.length, results });
  } catch (err) {
    console.error("[retry] cron error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
