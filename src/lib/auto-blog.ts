import { db } from "@/db";
import { posts, postTags, media, contentQueue } from "@/db/schema";
import { generateGameBlog } from "@/lib/ai-blog-engine";
import { generateBlogHeroImage } from "@/lib/ai-image";
import { notifyBlogDraftReady } from "@/lib/telegram";
import { enrichPickData } from "@/lib/blog-enrichment";
import { todayISOET } from "@/lib/timezone";
import { like } from "drizzle-orm";

type AutoBlogInput = {
  sport: string;
  league?: string | null;
  matchup: string;
  pickText?: string;
  gameDate?: string | null;
  odds?: number | null;
  units?: number | null;
  confidence?: string | number | null;
  tier?: string;
  analysisEn?: string | null;
  blogConfig?: { postType?: string };
};

type AutoBlogResult = {
  postId: string;
  slug: string;
  title: string;
  featuredImage: string | null;
  imageError: string | null;
  blogError: string | null;
  timing: { enrichmentMs: number; totalMs: number };
};

/**
 * Core auto-blog generation logic. Can be called directly (no auth required)
 * or via the /api/admin/auto-blog route (which adds auth).
 */
export async function runAutoBlog(data: AutoBlogInput): Promise<AutoBlogResult> {
  const startTime = Date.now();

  // Step 0: Check for duplicate — prevent creating two posts for the same matchup
  const slugBase = data.matchup
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const existing = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.titleEn, featuredImage: posts.featuredImage })
    .from(posts)
    .where(like(posts.slug, `%${slugBase}%`))
    .limit(1);

  if (existing.length > 0) {
    const dup = existing[0];
    console.log(`[auto-blog] Duplicate detected: "${dup.title}" (${dup.slug})`);
    return {
      postId: dup.id,
      slug: dup.slug,
      title: dup.title || data.matchup,
      featuredImage: dup.featuredImage || null,
      imageError: null,
      blogError: `A blog post for this matchup already exists: ${dup.slug}`,
      timing: { enrichmentMs: 0, totalMs: Date.now() - startTime },
    };
  }

  // Step 1: Fetch enrichment data from ESPN + The Odds API (with 25s timeout)
  let enrichment: Awaited<ReturnType<typeof enrichPickData>> | null = null;
  try {
    enrichment = await Promise.race([
      enrichPickData({
        sport: data.sport,
        league: data.league || null,
        matchup: data.matchup,
        pickText: data.pickText || "",
        gameDate: data.gameDate || todayISOET(),
        odds: data.odds || null,
        units: data.units || null,
        confidence: data.confidence != null ? String(data.confidence) : null,
        analysisEn: data.analysisEn || null,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Enrichment timed out after 25s")), 25000)
      ),
    ]);
    console.log(
      "[auto-blog] Enrichment complete:",
      enrichment.fetchLog.map((l) => `${l.field}: ${l.status}`).join(", ")
    );
  } catch (err) {
    console.error("[auto-blog] Enrichment failed/timed out, continuing with fallback data:", err);
  }

  if (enrichment) {
    const ok = enrichment.fetchLog.filter(l => l.status === "ok").length;
    const na = enrichment.fetchLog.filter(l => l.status === "unavailable").length;
    console.log(`[auto-blog] Enrichment: ${ok} fields OK, ${na} unavailable. Teams: ${enrichment.teamAFullName} vs ${enrichment.teamBFullName}`);
  } else {
    console.warn("[auto-blog] Running without enrichment — blog will use fallback data only");
  }

  const enrichmentMs = Date.now() - startTime;

  // Step 2: Run blog generation and image generation in parallel
  const [blogResult, imageResult] = await Promise.all([
    generateGameBlog(
      {
        sport: data.sport,
        league: data.league || null,
        matchup: data.matchup,
        pickText: data.pickText || "",
        gameDate: data.gameDate || todayISOET(),
        odds: data.odds || null,
        units: data.units || null,
        confidence: data.confidence != null ? String(data.confidence) : null,
        tier: data.tier || "vip",
        analysisEn: data.analysisEn || null,
      },
      enrichment?.dataBlock
    ),
    generateBlogHeroImage(
      data.matchup,
      data.league || data.sport,
      enrichment?.teamAFullName,
      enrichment?.teamBFullName
    ),
  ]);

  const totalMs = Date.now() - startTime;
  console.log(
    `[auto-blog] Generation complete in ${totalMs}ms (enrichment: ${enrichmentMs}ms, generation: ${totalMs - enrichmentMs}ms)`
  );

  // Retry image once if it failed
  if (!imageResult.url) {
    console.warn(`[auto-blog] Image failed (${imageResult.error}), retrying once...`);
    try {
      const retryResult = await generateBlogHeroImage(
        data.matchup,
        data.league || data.sport,
        enrichment?.teamAFullName,
        enrichment?.teamBFullName
      );
      if (retryResult.url) {
        Object.assign(imageResult, retryResult);
        console.log(`[auto-blog] Image retry succeeded: ${retryResult.url}`);
      } else {
        console.error(`[auto-blog] Image retry also failed: ${retryResult.error}`);
      }
    } catch (retryErr) {
      console.error(`[auto-blog] Image retry threw:`, retryErr);
    }
  }

  if (blogResult.error && !blogResult.bodyEn) {
    throw new Error(`Blog generation failed: ${blogResult.error}`);
  }

  // Clean slug
  const slug = blogResult.slug || data.matchup
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const postId = crypto.randomUUID();
  const now = new Date().toISOString();
  const featuredImage = imageResult.url || null;

  // Save the image to media table if generated
  if (imageResult.url && imageResult.filename) {
    await db.insert(media).values({
      id: crypto.randomUUID(),
      filename: imageResult.filename,
      url: imageResult.url,
      mimeType: "image/png",
      altText: blogResult.altText || `${data.matchup} game preview`,
    });
  }

  // Create the blog post as draft
  await db.insert(posts).values({
    id: postId,
    slug,
    titleEn: blogResult.titleEn,
    titleEs: blogResult.titleEs || null,
    bodyEn: blogResult.bodyEn,
    bodyEs: blogResult.bodyEs || null,
    category: data.blogConfig?.postType === "betting_guide" ? "strategy"
      : data.blogConfig?.postType === "rivalry_breakdown" ? "game_preview"
      : "game_preview",
    featuredImage,
    ogImage: featuredImage,
    seoTitle: blogResult.seoTitle || null,
    seoDescription: blogResult.seoDescription || null,
    status: "draft",
    author: "WinFact",
    createdAt: now,
    updatedAt: now,
  });

  // Add sport tag
  if (data.sport) {
    await db.insert(postTags).values([{ postId, sport: data.sport }]);
  }

  // Insert into content queue
  await db.insert(contentQueue).values({
    id: crypto.randomUUID(),
    type: "blog",
    referenceId: postId,
    title: blogResult.titleEn || data.matchup,
    preview: blogResult.seoDescription || `${data.sport}: ${data.matchup}`,
    imageUrl: featuredImage || null,
    status: "draft",
  }).catch((err) => console.error("[auto-blog] Content queue insert failed:", err));

  // Notify via Telegram
  const imageStatus = featuredImage ? "with AI image" : "WITHOUT image (generation failed)";
  notifyBlogDraftReady({
    title: blogResult.titleEn || data.matchup,
    sport: data.sport,
    matchup: data.matchup,
    slug,
    postId,
    imageStatus,
  }).catch((err) => console.error("[auto-blog] Content bot notification failed:", err));

  return {
    postId,
    slug,
    title: blogResult.titleEn,
    featuredImage,
    imageError: imageResult.error || null,
    blogError: blogResult.error || null,
    timing: { enrichmentMs, totalMs },
  };
}
