import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, postTags, media } from "@/db/schema";
import { generateGameBlog } from "@/lib/ai-blog-engine";
import { generateMatchupImage } from "@/lib/ai-image";
import { notifyBlogDraftReady } from "@/lib/notifications";
import { enrichPickData } from "@/lib/blog-enrichment";
import { todayISOET } from "@/lib/timezone";

/**
 * POST /api/admin/auto-blog
 * Generates a full blog post + AI image for a pick, saves as draft.
 * Now enriches the blog with real data from ESPN + The Odds API.
 * Body: { pickId, sport, league, matchup, pickText, gameDate, odds, units, confidence, tier, analysisEn }
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();

    if (!data.matchup || !data.sport) {
      return NextResponse.json(
        { error: "matchup and sport are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Step 1: Fetch enrichment data from ESPN + The Odds API
    let enrichment: Awaited<ReturnType<typeof enrichPickData>> | null = null;
    try {
      enrichment = await enrichPickData({
        sport: data.sport,
        league: data.league || null,
        matchup: data.matchup,
        pickText: data.pickText || "",
        gameDate: data.gameDate || todayISOET(),
        odds: data.odds || null,
        units: data.units || null,
        confidence: data.confidence || null,
        analysisEn: data.analysisEn || null,
      });
      console.log(
        "[auto-blog] Enrichment complete:",
        enrichment.fetchLog.map((l) => `${l.field}: ${l.status}`).join(", ")
      );
    } catch (err) {
      console.error("[auto-blog] Enrichment failed, continuing without data:", err);
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
          confidence: data.confidence || null,
          tier: data.tier || "vip",
          analysisEn: data.analysisEn || null,
        },
        enrichment?.dataBlock // Inject real data into blog prompt
      ),
      generateMatchupImage(
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

    if (blogResult.error && !blogResult.bodyEn) {
      return NextResponse.json(
        { error: `Blog generation failed: ${blogResult.error}` },
        { status: 500 }
      );
    }

    // Ensure slug is unique by appending random suffix if needed
    const baseSlug = blogResult.slug || data.matchup
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const postId = crypto.randomUUID();
    const now = new Date().toISOString();
    const featuredImage = imageResult.url || null;

    // Save the image to media table if generated
    if (imageResult.url && imageResult.filename) {
      const mediaId = crypto.randomUUID();
      await db.insert(media).values({
        id: mediaId,
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
      category: data.tier === "free" ? "free_pick" : "game_preview",
      featuredImage,
      ogImage: featuredImage,
      seoTitle: blogResult.seoTitle || null,
      seoDescription: blogResult.seoDescription || null,
      status: "draft",
      author: "WinFact AI",
      createdAt: now,
      updatedAt: now,
    });

    // Add sport tag
    const sportTag = data.sport;
    if (sportTag) {
      await db.insert(postTags).values([{ postId, sport: sportTag }]);
    }

    // Notify admin via Telegram (fire-and-forget)
    notifyBlogDraftReady({
      title: blogResult.titleEn || data.matchup,
      sport: data.sport,
      matchup: data.matchup,
      slug,
    }).catch((err) => console.error("Blog draft notification failed:", err));

    return NextResponse.json({
      postId,
      slug,
      title: blogResult.titleEn,
      featuredImage,
      imageError: imageResult.error || null,
      blogError: blogResult.error || null,
      enrichment: enrichment
        ? {
            fieldsOk: enrichment.fetchLog.filter((l) => l.status === "ok").length,
            fieldsUnavailable: enrichment.fetchLog.filter((l) => l.status === "unavailable").length,
            log: enrichment.fetchLog,
          }
        : null,
      timing: { enrichmentMs, totalMs },
    });
  } catch (error) {
    console.error("Auto-blog error:", error);
    return NextResponse.json(
      { error: "Failed to generate blog" },
      { status: 500 }
    );
  }
}
