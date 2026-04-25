import { db } from "@/db";
import { posts, postTags, media, contentQueue, siteContent } from "@/db/schema";
import { generateGameBlog } from "@/lib/ai-blog-engine";
import { generateBlogHeroImage } from "@/lib/ai-image";
import { notifyBlogPublished, sendAdminNotification } from "@/lib/telegram";
import { enrichPickData } from "@/lib/blog-enrichment";
import { todayISOET } from "@/lib/timezone";
import { pingIndexNowForBlog } from "@/lib/indexnow";
import { like, eq } from "drizzle-orm";

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
  pickId?: string;
};

type AutoBlogResult = {
  postId: string;
  slug: string;
  title: string;
  featuredImage: string | null;
  imageError: string | null;
  blogError: string | null;
  timing: { enrichmentMs: number; totalMs: number };
  skipped?: boolean;
  reason?: string;
};

/**
 * Single source of truth for the blog auto-generator feature gate.
 * Priority order:
 *   1. ENABLE_AUTO_BLOG env var — operational kill switch (explicit "true"/"false" both honored)
 *   2. site_content.blog_auto_generator row — runtime config
 * Fails closed on DB error.
 */
export async function isBlogAutoGenEnabled(): Promise<boolean> {
  if (process.env.ENABLE_AUTO_BLOG === "true") return true;
  if (process.env.ENABLE_AUTO_BLOG === "false") return false;

  try {
    const [row] = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.key, "blog_auto_generator"))
      .limit(1);
    return row?.value === "true";
  } catch (err) {
    console.error("[auto-blog] feature gate check failed:", err);
    return false;
  }
}

function alertAdmin(stage: string, context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[auto-blog] ${stage} failed (${context}):`, err);
  sendAdminNotification(
    `⚠️ <b>Auto-blog: ${stage} failed</b>\n\nContext: ${context}\nError: ${msg}`
  ).catch(() => {});
}

/**
 * Core auto-blog generation logic. Can be called directly (no auth required)
 * or via the /api/admin/auto-blog route (which adds auth).
 *
 * Behavior (auto-publish policy):
 *   - Skips silently if feature gate is off (returns { skipped: true, reason }).
 *   - Inserts posts row with status="published" and publishedAt=now.
 *   - Inserts content_queue row with status="scheduled" and scheduledAt=now
 *     so the every-5-minute queue processor distributes to Facebook + Telegram.
 *   - Fires Telegram admin notification AFTER publish.
 *   - Any pipeline failure produces a Telegram admin alert; stages that aren't
 *     load-bearing (media insert, notification) don't abort the run.
 */
export async function runAutoBlog(data: AutoBlogInput): Promise<AutoBlogResult> {
  const startTime = Date.now();
  const pickContext = `${data.sport} · ${data.matchup}${data.pickId ? ` (pick ${data.pickId})` : ""}`;

  // Feature gate
  if (!(await isBlogAutoGenEnabled())) {
    console.log("[auto-blog] skipped: feature disabled via env or site_content");
    return {
      postId: "",
      slug: "",
      title: "",
      featuredImage: null,
      imageError: null,
      blogError: null,
      timing: { enrichmentMs: 0, totalMs: Date.now() - startTime },
      skipped: true,
      reason: "feature_disabled",
    };
  }

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
    // Non-fatal: blog still runs on fallback data block with "Data unavailable" markers.
    // Alert so Oscar knows enrichment is degraded (often means ESPN/Odds API outage).
    alertAdmin("enrichment", pickContext, err);
  }

  if (enrichment) {
    const ok = enrichment.fetchLog.filter(l => l.status === "ok").length;
    const na = enrichment.fetchLog.filter(l => l.status === "unavailable").length;
    console.log(`[auto-blog] Enrichment: ${ok} fields OK, ${na} unavailable. Teams: ${enrichment.teamAFullName} vs ${enrichment.teamBFullName}`);
  } else {
    console.warn("[auto-blog] Running without enrichment — blog will use fallback data only");
  }

  const enrichmentMs = Date.now() - startTime;

  // Step 2: Run blog generation and image generation in parallel.
  // Generation failure is load-bearing and aborts the run; image failure is not.
  let blogResult: Awaited<ReturnType<typeof generateGameBlog>>;
  let imageResult: Awaited<ReturnType<typeof generateBlogHeroImage>>;
  try {
    [blogResult, imageResult] = await Promise.all([
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
  } catch (err) {
    alertAdmin("generation (Claude/image parallel)", pickContext, err);
    throw err;
  }

  const totalMs = Date.now() - startTime;
  console.log(
    `[auto-blog] Generation complete in ${totalMs}ms (enrichment: ${enrichmentMs}ms, generation: ${totalMs - enrichmentMs}ms)`
  );

  // Retry image once if it failed (non-fatal)
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
        alertAdmin("image generation (after retry)", pickContext, retryResult.error || "no url returned");
      }
    } catch (retryErr) {
      alertAdmin("image retry threw", pickContext, retryErr);
    }
  }

  if (blogResult.error && !blogResult.bodyEn) {
    alertAdmin("blog body empty", pickContext, blogResult.error);
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

  // Save the image to media table if generated (non-fatal)
  if (imageResult.url && imageResult.filename) {
    try {
      await db.insert(media).values({
        id: crypto.randomUUID(),
        filename: imageResult.filename,
        url: imageResult.url,
        mimeType: "image/png",
        altText: blogResult.altText || `${data.matchup} game preview`,
      });
    } catch (err) {
      alertAdmin("media insert", pickContext, err);
    }
  }

  // Create the blog post as PUBLISHED immediately (auto-publish policy).
  // Load-bearing: if this fails, the whole run fails.
  try {
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
      status: "published",
      publishedAt: now,
      author: "WinFact",
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    alertAdmin("posts insert", pickContext, err);
    throw err;
  }

  // Add sport tag (non-fatal)
  if (data.sport) {
    try {
      await db.insert(postTags).values([{ postId, sport: data.sport }]);
    } catch (err) {
      alertAdmin("postTags insert", pickContext, err);
    }
  }

  // Insert into content queue as SCHEDULED so the process-content-queue cron
  // (every 5 min) picks it up and distributes to Facebook + Telegram.
  try {
    await db.insert(contentQueue).values({
      id: crypto.randomUUID(),
      type: "blog",
      referenceId: postId,
      title: blogResult.titleEn || data.matchup,
      preview: blogResult.seoDescription || `${data.sport}: ${data.matchup}`,
      imageUrl: featuredImage || null,
      status: "scheduled",
      scheduledAt: now,
    });
  } catch (err) {
    alertAdmin("content_queue insert", pickContext, err);
  }

  // Notify via Telegram (non-fatal)
  const imageStatus = featuredImage ? "with AI image" : "WITHOUT image (generation failed)";
  notifyBlogPublished({
    title: blogResult.titleEn || data.matchup,
    sport: data.sport,
    matchup: data.matchup,
    slug,
    postId,
    imageStatus,
    hasSpanish: !!(blogResult.titleEs && blogResult.bodyEs),
  }).catch((err) => alertAdmin("Telegram notify", pickContext, err));

  // IndexNow ping (Bing/Yandex). Fire-and-forget — Google still discovers
  // via sitemap but IndexNow can shave 3-7 days off cross-engine surfacing.
  pingIndexNowForBlog(slug).catch(() => {});

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
