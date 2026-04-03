import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentQueue, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram";

const TELEGRAM_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHAT_ID || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";

/**
 * POST /api/admin/content-queue/[id]/telegram
 *
 * Send a content queue item to the Telegram free community group.
 * Supports: matchup graphics (photo + caption), blog URLs, victory posts.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  if (!TELEGRAM_FREE_CHAT_ID) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 500 });
  }

  try {
    const [item] = await db
      .select()
      .from(contentQueue)
      .where(eq(contentQueue.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let result: { ok: boolean; messageId?: number; error?: string };

    if (item.type === "filler" || item.type === "victory_post") {
      // Send photo with caption
      if (!item.imageUrl) {
        return NextResponse.json({ error: "No image URL available" }, { status: 400 });
      }

      // Pick Spanish caption ~60% of the time
      const caption = Math.random() < 0.6
        ? (item.captionEs || item.captionEn || item.title)
        : (item.captionEn || item.captionEs || item.title);

      const fullCaption = item.hashtags
        ? `${caption}\n\n${item.hashtags}`
        : caption;

      result = await sendTelegramPhoto(
        TELEGRAM_FREE_CHAT_ID,
        item.imageUrl,
        fullCaption,
        { parseMode: "none" }
      );
    } else if (item.type === "blog") {
      // Send blog link with preview
      const [post] = await db
        .select({ slug: posts.slug, titleEn: posts.titleEn, titleEs: posts.titleEs })
        .from(posts)
        .where(eq(posts.id, item.referenceId))
        .limit(1);

      const blogUrl = post?.slug ? `${SITE_URL}/en/blog/${post.slug}` : SITE_URL;
      const title = post?.titleEs || post?.titleEn || item.title;

      const message = `📝 ${title}\n\n${blogUrl}`;

      result = await sendTelegramMessage(TELEGRAM_FREE_CHAT_ID, message, { parseMode: "none" });
    } else {
      return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
    }

    if (result.ok) {
      return NextResponse.json({ ok: true, messageId: result.messageId });
    }

    return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
  } catch (error) {
    console.error("[content-queue/telegram] Error:", error);
    return NextResponse.json({ error: "Failed to send to Telegram" }, { status: 500 });
  }
}
