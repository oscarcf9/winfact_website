import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { postVictoryToSocial, postFillerToSocial, postBlogToSocial } from "@/lib/social-posting";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";

/**
 * POST /api/admin/content-queue/[id]/buffer
 *
 * Send a content queue item to all Buffer-connected platforms
 * (Twitter/X, Threads, Instagram, Facebook — whatever is connected in your Buffer account).
 * Supports: image posts (victory/filler) and blog link posts.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  try {
    const [item] = await db
      .select()
      .from(contentQueue)
      .where(eq(contentQueue.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let result: { ok: boolean; error?: string };

    if (item.type === "victory_post") {
      if (!item.imageUrl) {
        return NextResponse.json({ error: "No image URL available" }, { status: 400 });
      }
      result = await postVictoryToSocial({
        captionEn: item.captionEn || item.title,
        captionEs: item.captionEs || item.captionEn || item.title,
        imageUrl: item.imageUrl,
        hashtags: item.hashtags || "#WinFactPicks #Winner",
      });
    } else if (item.type === "filler") {
      if (!item.imageUrl) {
        return NextResponse.json({ error: "No image URL available" }, { status: 400 });
      }
      result = await postFillerToSocial({
        captionEn: item.captionEn || item.title,
        captionEs: item.captionEs || item.captionEn || item.title,
        imageUrl: item.imageUrl,
        hashtags: item.hashtags || "#WinFactPicks #GameDay",
      });
    } else if (item.type === "blog") {
      const [post] = await db
        .select({ slug: posts.slug, titleEn: posts.titleEn, titleEs: posts.titleEs })
        .from(posts)
        .where(eq(posts.id, item.referenceId))
        .limit(1);

      const blogUrl = post?.slug ? `${SITE_URL}/en/blog/${post.slug}` : SITE_URL;
      const title = post?.titleEs || post?.titleEn || item.title;

      result = await postBlogToSocial({
        title,
        url: blogUrl,
        imageUrl: item.imageUrl || undefined,
      });
    } else {
      return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
    }

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: result.error || "Failed to post to Buffer" }, { status: 500 });
  } catch (error) {
    console.error("[content-queue/buffer] Error:", error);
    return NextResponse.json({ error: "Failed to post to Buffer" }, { status: 500 });
  }
}
