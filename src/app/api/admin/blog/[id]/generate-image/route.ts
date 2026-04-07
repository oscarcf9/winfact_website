import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateBlogHeroImage } from "@/lib/ai-image";

/**
 * POST /api/admin/blog/[id]/generate-image
 * Generates an AI matchup image for an existing blog post and saves it as the featured image.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  try {
    // Get the post
    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Extract matchup info from the title
    const title = post.titleEn || "";
    // Try to extract sport from title or default
    const body = req.headers.get("content-type")?.includes("json")
      ? await req.json().catch(() => ({}))
      : {};
    const sport = body.sport || "Sports";
    const matchup = body.matchup || title;

    console.log(`[generate-image] Generating image for post ${id}: ${matchup} (${sport})`);

    const imageResult = await generateBlogHeroImage(matchup, sport);

    if (!imageResult.url) {
      console.error(`[generate-image] Image generation failed:`, imageResult.error);
      return NextResponse.json(
        { error: `Image generation failed: ${imageResult.error}` },
        { status: 500 }
      );
    }

    // Save to media table
    if (imageResult.filename) {
      await db.insert(media).values({
        id: crypto.randomUUID(),
        filename: imageResult.filename,
        url: imageResult.url,
        mimeType: "image/png",
        altText: `${matchup} game preview`,
      });
    }

    // Update the post with the new image
    await db
      .update(posts)
      .set({
        featuredImage: imageResult.url,
        ogImage: imageResult.url,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id));

    console.log(`[generate-image] Success: ${imageResult.url}`);

    return NextResponse.json({
      url: imageResult.url,
      filename: imageResult.filename,
    });
  } catch (error) {
    console.error("[generate-image] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
