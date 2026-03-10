import { NextRequest, NextResponse } from "next/server";
import { getPublishedPosts, getPostTags } from "@/db/queries/posts";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { success } = rateLimit(request);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const posts = await getPublishedPosts({ category, limit, offset });

    const postsWithTags = await Promise.all(
      posts.map(async (post) => {
        const tags = await getPostTags(post.id);
        return {
          ...post,
          sports: tags.map((t) => t.sport),
        };
      })
    );

    return NextResponse.json({
      posts: postsWithTags,
      count: postsWithTags.length,
      offset,
    });
  } catch (error) {
    console.error("Blog API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
