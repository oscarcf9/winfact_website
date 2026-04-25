import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq, and, lte, lt, desc, isNotNull, inArray } from "drizzle-orm";
import { postVictoryToSocial, postFillerToSocial, postBlogToSocial } from "@/lib/social-posting";
import { sendTelegramPhoto, notifyFillerPosted } from "@/lib/telegram";
import { sendAdminNotification } from "@/lib/telegram";
import { enqueueRetryForFailedChannels } from "@/lib/content-queue-retry";
import { getSiteContent } from "@/db/queries/site-content";
import { hourET } from "@/lib/timezone";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";

// Brand guideline: minimum 30 minutes between any two social posts from the queue.
// Applies across all channels and all content types (filler, victory, blog).
const MIN_GAP_MS = 30 * 60 * 1000;

// If a row has been in 'processing' longer than this, assume the processor
// that claimed it crashed mid-flight and reset it back to 'scheduled'.
// Must be longer than worst-case Buffer fan-out time.
const STALE_PROCESSING_MS = 10 * 60 * 1000;

// Filler is matchup hype — nobody wants pre-game graphics for games that
// already happened. If a filler row's scheduledAt is more than this far in
// the past, we cancel it instead of posting. Prevents the "2 AM posting
// yesterday's calendar" failure mode.
const FILLER_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

// Filler is allowed to post during waking hours in ET only. Outside this
// window, the processor leaves filler rows alone (other types are
// unaffected). Window is inclusive on both ends.
const FILLER_WINDOW_START_HOUR_ET = 9;
const FILLER_WINDOW_END_HOUR_ET = 22; // last hour to post is 22 (10 PM)

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

    // ── Step 0a: Honor admin toggle — kill pending filler if disabled ─
    // Acts as a kill switch when the operator flips the admin UI toggle.
    // Without this, queued filler rows keep posting after "disable".
    const fillerEnabled = (await getSiteContent("filler_content_enabled")) === "true";
    if (!fillerEnabled) {
      const cancelled = await db
        .update(contentQueue)
        .set({ status: "failed", error: "cancelled_filler_disabled" })
        .where(
          and(
            eq(contentQueue.type, "filler"),
            inArray(contentQueue.status, ["draft", "scheduled"])
          )
        )
        .returning({ id: contentQueue.id });
      if (cancelled.length > 0) {
        console.log(`[queue] cancelled ${cancelled.length} pending filler rows (toggle off)`);
      }
    }

    // ── Step 0b: Drop stale filler rows ──────────────────────────────
    // Filler is pre-game hype; posting it long after the game starts is
    // worse than not posting it. Wipe any filler row whose scheduledAt is
    // beyond FILLER_STALE_AFTER_MS in the past.
    const staleFillerCutoff = new Date(Date.now() - FILLER_STALE_AFTER_MS).toISOString();
    const staleFiller = await db
      .update(contentQueue)
      .set({ status: "failed", error: "stale_filler_skipped" })
      .where(
        and(
          eq(contentQueue.type, "filler"),
          eq(contentQueue.status, "scheduled"),
          lt(contentQueue.scheduledAt, staleFillerCutoff)
        )
      )
      .returning({ id: contentQueue.id });
    if (staleFiller.length > 0) {
      console.log(`[queue] cancelled ${staleFiller.length} stale filler rows (>${FILLER_STALE_AFTER_MS / 3600000}h past)`);
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
    // When outside the filler ET window (9 AM – 10 PM ET), exclude filler
    // type from the candidate query so we don't claim-and-release on every
    // tick. Other types (blog, victory) still post 24/7.
    const h = hourET();
    const inFillerWindow = h >= FILLER_WINDOW_START_HOUR_ET && h <= FILLER_WINDOW_END_HOUR_ET;
    const candidateWhere = inFillerWindow
      ? and(eq(contentQueue.status, "scheduled"), lte(contentQueue.scheduledAt, now))
      : and(
          eq(contentQueue.status, "scheduled"),
          lte(contentQueue.scheduledAt, now),
          inArray(contentQueue.type, ["blog", "victory_post"])
        );

    const [candidate] = await db
      .select({ id: contentQueue.id })
      .from(contentQueue)
      .where(candidateWhere)
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

    // Defense in depth: the candidate query already excludes filler when
    // outside the ET window, but if the toggle disabled filler mid-run we
    // should still skip processing.
    if (item.type === "filler" && !fillerEnabled) {
      await db
        .update(contentQueue)
        .set({ status: "failed", error: "cancelled_filler_disabled" })
        .where(eq(contentQueue.id, item.id));
      return NextResponse.json({
        processed: 0,
        posted: 0,
        failed: 1,
        reason: "filler_disabled",
        reclaimed: reclaimed.length,
      });
    }

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
          .select({
            slug: posts.slug,
            titleEn: posts.titleEn,
            titleEs: posts.titleEs,
            featuredImage: posts.featuredImage,
            seoDescription: posts.seoDescription,
          })
          .from(posts)
          .where(eq(posts.id, item.referenceId))
          .limit(1);

        if (post?.slug) {
          const blogUrl = `${SITE_URL}/en/blog/${post.slug}`;
          const title = post.titleEs || post.titleEn || item.title;
          // Prefer the post row's featuredImage; fall back to the queue row's snapshot.
          const imageUrl = post.featuredImage || item.imageUrl || null;
          // Excerpt: SEO description (short marketing blurb) or the queue row's
          // preview field (falls back to a sport/matchup line).
          const excerpt = post.seoDescription?.trim() || item.preview?.trim() || null;
          try {
            const result = await postBlogToSocial({ title, url: blogUrl, imageUrl, excerpt });
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
            threadsImageUrl: item.threadsImageUrl,
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
            threadsImageUrl: item.threadsImageUrl,
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

        // Telegram (always, not random — randomness is in social-posting for Buffer).
        // Hashtags are stripped (noise on chat feeds, don't drive discovery
        // there). The LLM bakes a hashtag block into captionEn itself (per the
        // filler-content prompt), so removing item.hashtags isn't enough — we
        // also strip inline #tokens. Uses the 1080x1080 square variant when
        // available; a 4:5 portrait crops awkwardly in Telegram's bubble.
        if (TELEGRAM_FREE_CHAT_ID && item.imageUrl) {
          try {
            let caption = stripHashtagsForTelegram(item.captionEn || item.title);
            if (caption.length > 1024) caption = caption.substring(0, 1021) + "...";

            const telegramPhotoUrl = item.telegramImageUrl || item.imageUrl;
            const tgResult = await sendTelegramPhoto(TELEGRAM_FREE_CHAT_ID, telegramPhotoUrl, caption, { parseMode: "none" });
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

        // Only retry victory posts. Filler is pre-game hype graphics — it's
        // better to skip a missing channel than to repost the same matchup
        // graphic minutes later (which is exactly the "same calendar
        // repeats" pattern the user reported).
        if (failedChannels.length > 0 && item.type === "victory_post") {
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

function stripHashtagsForTelegram(caption: string): string {
  return caption
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
