import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runAutoBlog } from "@/lib/auto-blog";

/**
 * POST /api/admin/auto-blog
 * Generates a full blog post + AI image for a pick, saves as draft.
 * Enriches the blog with real data from ESPN + The Odds API.
 * Body: { sport, league, matchup, pickText, gameDate, odds, units, confidence, tier, analysisEn }
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

    const result = await runAutoBlog(data);

    return NextResponse.json({
      postId: result.postId,
      slug: result.slug,
      title: result.title,
      featuredImage: result.featuredImage,
      imageError: result.imageError,
      blogError: result.blogError,
      timing: result.timing,
    });
  } catch (error) {
    console.error("Auto-blog error:", error);
    return NextResponse.json(
      { error: "Failed to generate blog" },
      { status: 500 }
    );
  }
}
