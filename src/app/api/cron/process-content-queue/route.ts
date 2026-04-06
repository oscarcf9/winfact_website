import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { postVictoryToSocial, postFillerToSocial, postBlogToSocial } from "@/lib/social-posting";
import { sendTelegramPhoto, notifyFillerPosted } from "@/lib/telegram";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";
const MIN_GAP_MS = 30 * 60 * 1000; // 30 minutes between posts

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

    // Check when the last item was posted (anti-spam cadence)
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
      });
    }

    // Get ONE due item (oldest first) to respect the gap — don't batch
    const due = await db
      .select()
      .from(contentQueue)
      .where(
        and(
          eq(contentQueue.status, "scheduled"),
          lte(contentQueue.scheduledAt, now)
        )
      )
      .orderBy(contentQueue.scheduledAt)
      .limit(1);

    if (due.length === 0) {
      return NextResponse.json({ processed: 0, posted: 0, failed: 0 });
    }

    const item = due[0];
    let bufferOk = false;
    let telegramOk = false;
    let bufferError = "";
    let telegramError = "";

    try {
      // ── Blog publishing ──────────────────────────────────────────
      if (item.type === "blog") {
        await db
          .update(posts)
          .set({ status: "published", publishedAt: now })
          .where(eq(posts.id, item.referenceId));

        const [post] = await db
          .select({ slug: posts.slug, titleEn: posts.titleEn, titleEs: posts.titleEs })
          .from(posts)
          .where(eq(posts.id, item.referenceId))
          .limit(1);

        if (post?.slug) {
          const blogUrl = `${SITE_URL}/en/blog/${post.slug}`;
          const title = post.titleEs || post.titleEn || item.title;
          // Blog → Facebook + Telegram (handled by postBlogToSocial)
          try {
            const result = await postBlogToSocial({ title, url: blogUrl });
            bufferOk = result.ok;
            if (!result.ok) bufferError = result.error || "Blog social share failed";
          } catch (err) {
            bufferError = String(err);
          }
        }
        // Blog is always "posted" since the DB publish succeeded
        telegramOk = true;
      }

      // ── Victory posts → Buffer (all channels) ────────────────────
      if (item.type === "victory_post" && item.imageUrl) {
        try {
          const result = await postVictoryToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #Winner",
          });
          bufferOk = result.ok;
          if (!result.ok) bufferError = result.error || "Victory Buffer failed";
          else console.log(`[content-queue] Victory post sent to Buffer: ${item.title}`);
        } catch (err) {
          bufferError = String(err);
          console.error(`[content-queue] Victory Buffer error:`, err);
        }

        // Victory posts don't go to Telegram via queue (handled separately)
        telegramOk = true;
      }

      // ── Filler posts → Buffer (all channels) + Telegram ──────────
      if (item.type === "filler" && item.imageUrl) {
        // Channel 1: Buffer (Instagram + Facebook + Twitter + Threads)
        try {
          const result = await postFillerToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #GameDay",
          });
          bufferOk = result.ok;
          if (!result.ok) bufferError = result.error || "Filler Buffer failed";
          else console.log(`[content-queue] Filler sent to Buffer: ${item.title}`);
        } catch (err) {
          bufferError = String(err);
          console.error(`[content-queue] Filler Buffer error:`, err);
        }

        // Channel 2: Telegram (always, not random — the randomness is in social-posting for Buffer)
        if (TELEGRAM_FREE_CHAT_ID && item.imageUrl) {
          try {
            // English only for Telegram
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
          telegramOk = true; // No Telegram configured = not a failure
        }
      }

      // ── Determine final status ────────────────────────────────────
      const deliveryResults = JSON.stringify({
        buffer: bufferOk ? "success" : bufferError || "skipped",
        telegram: telegramOk ? "success" : telegramError || "skipped",
      });

      if (bufferOk || telegramOk) {
        // At least one channel succeeded
        await db
          .update(contentQueue)
          .set({
            status: "posted",
            postedAt: new Date().toISOString(),
            error: (!bufferOk || !telegramOk) ? deliveryResults : null,
          })
          .where(eq(contentQueue.id, item.id));

        if (!bufferOk || !telegramOk) {
          console.warn(`[content-queue] Partial delivery for ${item.id}: ${deliveryResults}`);
        }

        // Notify Oscar via content bot when filler is posted
        if (item.type === "filler") {
          notifyFillerPosted({
            title: item.title,
            sport: item.preview?.split(" — ")[0] || "",
            channels: { buffer: bufferOk, telegram: telegramOk },
          }).catch(err => console.error("[content-queue] Filler notification failed:", err));
        }

        return NextResponse.json({ processed: 1, posted: 1, failed: 0, deliveryResults });
      } else {
        // Both channels failed
        await db
          .update(contentQueue)
          .set({ status: "failed", error: deliveryResults })
          .where(eq(contentQueue.id, item.id));

        return NextResponse.json({ processed: 1, posted: 0, failed: 1, deliveryResults });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[content-queue] Failed to process item ${item.id}:`, message);

      await db
        .update(contentQueue)
        .set({ status: "failed", error: message })
        .where(eq(contentQueue.id, item.id));

      return NextResponse.json({ processed: 1, posted: 0, failed: 1 });
    }
  } catch (error) {
    console.error("Content queue cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
