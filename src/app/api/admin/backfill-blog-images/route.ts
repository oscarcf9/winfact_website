import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, media } from "@/db/schema";
import { eq, isNull, or, desc } from "drizzle-orm";
import { generateBlogHeroImage } from "@/lib/ai-image";

// Generating up to 10 hero images sequentially can take 3-5 minutes.
export const maxDuration = 300;

/**
 * Backfill AI hero images for blog posts that were created while OpenAI had
 * no credits (featured_image is null or empty). Admin-only, manual trigger.
 *
 * GET  /api/admin/backfill-blog-images?dry=1&limit=5
 *   dry=1  → list what WOULD be backfilled, no API calls
 *   limit  → max number to regenerate this run (default 5, max 15)
 *
 * POST /api/admin/backfill-blog-images?limit=5
 *   Actually regenerates. Processes sequentially to stay under OpenAI
 *   rate limits and maxDuration.
 *
 * Each post that succeeds gets its featured_image + og_image updated and
 * a matching media row inserted.
 */
async function handle(req: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  // Default 3 to keep the call under typical HTTP response timeouts (~60s).
  // Each image is ~25s sequential; we run them in parallel below so 3 finish
  // in roughly the time of 1.
  const limitRaw = parseInt(url.searchParams.get("limit") || "3", 10);
  const limit = Math.max(1, Math.min(10, Number.isFinite(limitRaw) ? limitRaw : 3));

  // Find posts with no featured image. Covers both null and empty string.
  const candidates = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      titleEn: posts.titleEn,
      category: posts.category,
      featuredImage: posts.featuredImage,
    })
    .from(posts)
    .where(
      or(
        isNull(posts.featuredImage),
        eq(posts.featuredImage, "")
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  if (candidates.length === 0) {
    return NextResponse.json({
      status: "nothing_to_backfill",
      totalCandidates: 0,
    });
  }

  if (dry) {
    return NextResponse.json({
      status: "dry-run",
      totalCandidates: candidates.length,
      willProcess: candidates.map((c) => ({ id: c.id, slug: c.slug, title: c.titleEn })),
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Derive a matchup guess from the title. For game previews the title is
  // usually "Team A vs Team B: ..." or "Team A Faces Team B ..." — not perfect,
  // but the image prompt is generic sports artwork anyway.
  function deriveMatchup(title: string): string {
    const vsMatch = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:[:—\-,]|$)/i);
    if (vsMatch) return `${vsMatch[1].trim()} vs ${vsMatch[2].trim()}`;
    return title.slice(0, 80);
  }

  // Process all candidates IN PARALLEL so the HTTP call returns before any
  // proxy layer times out. Each image saves to DB independently — even if
  // the response is cut short, the DB writes already happened.
  const results = await Promise.all(
    candidates.map(async (post) => {
      const matchup = deriveMatchup(post.titleEn || post.slug);
      const sport = "Sports"; // generic for strategy posts; most are matchups anyway

      try {
        const img = await generateBlogHeroImage(matchup, sport);
        if (!img.url) {
          return {
            id: post.id,
            slug: post.slug,
            ok: false as const,
            error: img.error || "no url returned",
          };
        }

        await db
          .update(posts)
          .set({ featuredImage: img.url, ogImage: img.url, updatedAt: new Date().toISOString() })
          .where(eq(posts.id, post.id));

        if (img.filename) {
          await db
            .insert(media)
            .values({
              id: crypto.randomUUID(),
              filename: img.filename,
              url: img.url,
              mimeType: "image/png",
              altText: `${matchup} preview (backfilled)`,
            })
            .catch((err) => console.error("[backfill] media insert failed:", err));
        }

        return { id: post.id, slug: post.slug, ok: true as const, url: img.url };
      } catch (err) {
        return {
          id: post.id,
          slug: post.slug,
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  return NextResponse.json({
    status: "done",
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

export const GET = handle;
export const POST = handle;
