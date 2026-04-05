import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { postVictoryToSocial, postFillerToSocial, postBlogToSocial } from "@/lib/social-posting";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";

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

    const due = await db
      .select()
      .from(contentQueue)
      .where(
        and(
          eq(contentQueue.status, "scheduled"),
          lte(contentQueue.scheduledAt, now)
        )
      );

    let posted = 0;
    let failed = 0;

    for (const item of due) {
      try {
        // 1. Handle blog publishing (update post status in DB)
        if (item.type === "blog") {
          await db
            .update(posts)
            .set({ status: "published", publishedAt: now })
            .where(eq(posts.id, item.referenceId));

          // Blogs are published on winfactpicks.com only.
          // Share the link on Facebook via Buffer (link share, no image upload).
          const [post] = await db
            .select({ slug: posts.slug, titleEn: posts.titleEn, titleEs: posts.titleEs })
            .from(posts)
            .where(eq(posts.id, item.referenceId))
            .limit(1);

          if (post?.slug) {
            const blogUrl = `${SITE_URL}/en/blog/${post.slug}`;
            const title = post.titleEs || post.titleEn || item.title;
            // Share blog link on Facebook only (Buffer will use the OG meta tags)
            postBlogToSocial({
              title,
              url: blogUrl,
            }).catch((err) => console.error(`[content-queue] Blog Facebook share failed:`, err));
          }
        }

        // 2. Post victory posts to Buffer (all connected socials)
        if (item.type === "victory_post" && item.imageUrl) {
          const result = await postVictoryToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #Winner",
          });
          if (!result.ok) {
            console.error(`[content-queue] Victory social post failed: ${result.error}`);
          } else {
            console.log(`[content-queue] Victory post sent to Buffer: ${item.title}`);
          }
        }

        // 3. Post filler graphics to Buffer (all connected socials)
        if (item.type === "filler" && item.imageUrl) {
          const result = await postFillerToSocial({
            captionEn: item.captionEn || item.title,
            captionEs: item.captionEs || item.captionEn || item.title,
            imageUrl: item.imageUrl,
            hashtags: item.hashtags || "#WinFactPicks #GameDay",
          });
          if (!result.ok) {
            console.error(`[content-queue] Filler social post failed: ${result.error}`);
          } else {
            console.log(`[content-queue] Filler post sent to Buffer: ${item.title}`);
          }
        }

        // 4. Mark as posted
        await db
          .update(contentQueue)
          .set({ status: "posted", postedAt: now })
          .where(eq(contentQueue.id, item.id));

        posted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[content-queue] Failed to process item ${item.id}:`, message);

        await db
          .update(contentQueue)
          .set({ status: "failed", error: message })
          .where(eq(contentQueue.id, item.id));

        failed++;
      }
    }

    return NextResponse.json({ processed: due.length, posted, failed });
  } catch (error) {
    console.error("Content queue cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
