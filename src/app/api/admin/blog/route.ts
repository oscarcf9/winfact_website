import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(posts).values({
      id,
      slug: data.slug,
      titleEn: data.titleEn,
      titleEs: data.titleEs,
      bodyEn: data.bodyEn,
      bodyEs: data.bodyEs,
      category: data.category,
      featuredImage: data.featuredImage,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      status: data.status || "draft",
      publishedAt: data.status === "published" ? now : null,
      author: data.author || "WinFact",
    });

    if (data.tags?.length > 0) {
      await db.insert(postTags).values(
        data.tags.map((sport: string) => ({ postId: id, sport }))
      );
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
