import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq, and, lte, lt, desc, isNotNull } from "drizzle-orm";
import { postVictoryToSocial, postFillerToSocial, postBlogToSocial } from "@/lib/social-posting";
import { sendTelegramPhoto, notifyFillerPosted } from "@/lib/telegram";
import { sendAdminNotification } from "@/lib/telegram";
import { enqueueRetryForFailedChannels } from "@/lib/content-queue-retry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";

// Brand guideline: minimum 30 minutes between any two social posts from the queue.
// Applies across all channels and all content types (filler, victory, blog).
const MIN_GAP_MS = 30 * 60 * 1000;

// If a row has been in 'processing' longer than this, assume the processor
// that claimed it crashed mid-flight and reset it back to 'scheduled'.
// Must be longer than worst-case Buffer fan-out time.
const STALE_PROCESSING_MS = 10 * 60 * 1000;

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

    // ── Step 0: Reclaim stale 'processing' rows ──────────────────────
    // If a previous invocation claimed a row then crashed, the row will be
    // stuck in status='processing'. After STALE_PROCESSING_MS, flip it back
    // to 'scheduled' so a fresh invocation can retry.
    const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
    const reclaimed = await db
      .update(contentQueue)
      .set({
        status: "scheduled",
        error: "reclaimed after stale processing timeout",
      })
      .where(
        and(
          eq(contentQueue.status, "processing"),
          isNotNull(contentQueue.processingStartedAt),
          lt(contentQueue.processingStartedAt, staleCutoff)
        )
      )
      .returning({ id: contentQueue.id });

    if (reclaimed.length > 0) {
      console.log(`[queue] reclaimed ${reclaimed.length} stale processing rows: ${reclaimed.map((r) => r.id).join(", ")}`);
      sendAdminNotification(
        `♻️ <b>Queue: reclaimed ${reclaimed.length} stale 'processing' rows</b> (>${Math.round(STALE_PROCESSING_MS / 60000)}min old)\n\nIDs: ${reclaimed.map((r) => r.id).join(", ")}`
      ).catch(() => {});
    }

    // ── Step 1: Anti-spam cadence check ──────────────────────────────
    const [lastPosted] = await db
      .select({ postedAt: contentQueue.postedAt })
      .from(contentQueue)
      .where(eq(contentQueue.status, "posted"))
      .orderBy(desc(contentQueue.postedAt))
      .limit(1);

    const lastPostedTime = lastPosted?.postedAt ? new Date(lastPosted.postedAt).getTime() : 0;
    const timeSinceLastPost = Date.now() - lastPostedTime;

    if (timeSinceLastPost < MIN_GAP_MS) {
      const waitMin = Math.ceil((MIN_GAP_MS - timeSinceLastPost) / 60000);
      return NextResponse.json({
        status: "throttled",
        reason: `Last post was ${Math.round(timeSinceLastPost / 60000)}m ago, need ${waitMin}m more gap`,
        reclaimed: reclaimed.length,
      });
    }

    // ── Step 2: Find a candidate row (read-only, cheap) ──────────────
    const [candidate] = await db
      .select({ id: contentQueue.id })
      .from(contentQueue)
      .where(
        and(
          eq(contentQueue.status, "scheduled"),
          lte(contentQueue.scheduledAt, now)
        )
      )
      .orderBy(contentQueue.scheduledAt)
      .limit(1);

    if (!candidate) {
      return NextResponse.json({ processed: 0, posted: 0, failed: 0, reclaimed: reclaimed.length });
    }

    // ── Step 3: Atomic claim ─────────────────────────────────────────
    // The WHERE status='scheduled' guard is the critical idempotency check:
    // if another concurrent processor already claimed this row, our UPDATE
    // matches zero rows and .returning() yields an empty array.
    const claimedRows = await db
      .update(contentQueue)
      .set({
        status: "processing",
        processingStartedAt: now,
      })
      .where(
        and(
          eq(contentQueue.id, candidate.id),
          eq(contentQueue.status, "scheduled")
        )
      )
      .returning();

    const item = claimedRows[0];

    if (!item) {
      console.log(`[queue] row ${candidate.id} already claimed by another instance`);
      return NextResponse.json({
        processed: 0,
        posted: 0,
        failed: 0,
        reason: "already_claimed",
        reclaimed: reclaimed.length,
      });
    }

    // From here on, `item` is exclusively ours. Any abnormal exit must mark it
    // either 'posted' or 'failed' — never leave it as 'processing' (the next
    // cron tick's stale-reclaim will catch it otherwise, but sooner is better).

    let bufferOk = false;
    let telegramOk = false;
    let bufferError = "";
    let telegramError = "";
    let allSucceeded = false;
    let failedChannels: string[] = [];
    let retryEnqueued = false;
    let retryId: string | undefined;

    try {
      // ── Blog publishing ──────────────────────────────────────────
      if (item.type === "blog") {
        await db
          .update(posts)
          .set({ status: "published", publishedAt: now })
          .where(eq(posts.id, item.referenceId));

        const [post] = await db
          .select({ slug: posts.slug, titleEn: posts.titleEn, titleEs: posts.titleEs, featuredImage: posts.featuredImage })
          .from(posts)
          .where(eq(posts.id, item.referenceId))
          .limit(1);

        if (post?.slug) {
          const blogUrl = `${SITE_URL}/en/blog/${post.slug}`;
          const title = post.titleEs || post.titleEn || item.title;
          // Prefer the post row's featuredImage; fall back to the queue row's snapshot.
          const imageUrl = post.featuredImage || item.imageUrl || null;
          try {
            const result = await postBlogToSocial({ title, url: blogUrl, imageUrl });
            bufferOk = result.ok;
            if (!result.ok) bufferError = result.error || "Blog social share failed";
          } catch (err) {
            bufferError = String(err);
          }
        }
        telegramOk = true;
        allSucceeded = bufferOk;
      }

      // ── Victory posts → Buffer (all channels by default) ─────────
      if (item.type === "victory_post" && item.imageUrl) {
        try {
          const result = await postVictoryToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #Winner",
            route: item.platform || "all",
          });
          bufferOk = result.ok;
          allSucceeded = result.allSucceeded;
          failedChannels = result.failedChannels;
          if (!result.ok) bufferError = result.error || "Victory Buffer failed";
          else console.log(`[content-queue] Victory post sent to Buffer: ${item.title}`);
        } catch (err) {
          bufferError = String(err);
          console.error(`[content-queue] Victory Buffer error:`, err);
        }

        telegramOk = true;
      }

      // ── Filler posts: guard on missing image ─────────────────────
      if (item.type === "filler" && !item.imageUrl) {
        console.error(`[content-queue] Filler item ${item.id} has no imageUrl — marking failed. Title: ${item.title}`);
        await db
          .update(contentQueue)
          .set({ status: "failed", error: "No image URL — image generation likely failed" })
          .where(eq(contentQueue.id, item.id));
        return NextResponse.json({ processed: 1, posted: 0, failed: 1, reason: "no_image_url", reclaimed: reclaimed.length });
      }

      // ── Filler posts → Buffer (all channels by default) + Telegram ──
      if (item.type === "filler" && item.imageUrl) {
        try {
          const result = await postFillerToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #GameDay",
            route: item.platform || "all",
          });
          bufferOk = result.ok;
          allSucceeded = result.allSucceeded;
          failedChannels = result.failedChannels;
          if (!result.ok) bufferError = result.error || "Filler Buffer failed";
          else console.log(`[content-queue] Filler sent to Buffer: ${item.title}`);
        } catch (err) {
          bufferError = String(err);
          console.error(`[content-queue] Filler Buffer error:`, err);
        }

        // Telegram (always, not random — randomness is in social-posting for Buffer)
        if (TELEGRAM_FREE_CHAT_ID && item.imageUrl) {
          try {
            let caption = item.captionEn || item.title;
            if (item.hashtags) caption += `\n\n${item.hashtags}`;
            if (caption.length > 1024) caption = caption.substring(0, 1021) + "...";

            const tgResult = await sendTelegramPhoto(TELEGRAM_FREE_CHAT_ID, item.imageUrl, caption, { parseMode: "none" });
            telegramOk = tgResult.ok;
            if (!tgResult.ok) telegramError = tgResult.error || "Telegram failed";
            else console.log(`[content-queue] Filler sent to Telegram: ${item.title}`);
          } catch (err) {
            telegramError = String(err);
            console.error(`[content-queue] Filler Telegram error:`, err);
          }
        } else {
          telegramOk = true;
        }
      }

      // ── Determine final status ────────────────────────────────────
      const deliveryResults = JSON.stringify({
        buffer: bufferOk ? "success" : bufferError || "skipped",
        telegram: telegramOk ? "success" : telegramError || "skipped",
        allSucceeded,
        failedChannels,
      });

      if (bufferOk || telegramOk) {
        // At least one channel succeeded — mark posted.
        // If partial, enqueue a retry row for the failed channels so they
        // get another shot without re-posting to successful ones.
        const errorField = allSucceeded && bufferOk && telegramOk ? null : deliveryResults;

        await db
          .update(contentQueue)
          .set({
            status: "posted",
            postedAt: new Date().toISOString(),
            error: errorField,
          })
          .where(eq(contentQueue.id, item.id));

        if (failedChannels.length > 0 && (item.type === "filler" || item.type === "victory_post")) {
          const retry = await enqueueRetryForFailedChannels(
            item,
            failedChannels as ("instagram" | "facebook" | "threads" | "twitter")[]
          );
          retryEnqueued = retry.enqueued;
          retryId = retry.retryId;
        }

        if (!bufferOk || !telegramOk || !allSucceeded) {
          console.warn(`[content-queue] Partial delivery for ${item.id}: ${deliveryResults}`);
        }

        if (item.type === "filler") {
          notifyFillerPosted({
            title: item.title,
            sport: item.preview?.split(" — ")[0] || "",
            channels: { buffer: bufferOk, telegram: telegramOk },
          }).catch(err => console.error("[content-queue] Filler notification failed:", err));
        }

        return NextResponse.json({
          processed: 1,
          posted: 1,
          failed: 0,
          deliveryResults,
          retryEnqueued,
          retryId,
          reclaimed: reclaimed.length,
        });
      }

      // Both channels failed — mark failed and alert admin.
      await db
        .update(contentQueue)
        .set({ status: "failed", error: deliveryResults })
        .where(eq(contentQueue.id, item.id));

      sendAdminNotification(
        `⚠️ <b>Content queue row ${item.id} (${item.type}) failed</b>\n\nTitle: ${item.title}\nBuffer: ${bufferError || "n/a"}\nTelegram: ${telegramError || "n/a"}`
      ).catch(() => {});

      return NextResponse.json({
        processed: 1,
        posted: 0,
        failed: 1,
        deliveryResults,
        reclaimed: reclaimed.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[content-queue] Failed to process item ${item.id}:`, message);

      await db
        .update(contentQueue)
        .set({ status: "failed", error: message })
        .where(eq(contentQueue.id, item.id));

      sendAdminNotification(
        `⚠️ <b>Content queue row ${item.id} (${item.type}) threw</b>\n\nError: ${message}`
      ).catch(() => {});

      return NextResponse.json({
        processed: 1,
        posted: 0,
        failed: 1,
        reclaimed: reclaimed.length,
      });
    }
  } catch (error) {
    console.error("Content queue cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
