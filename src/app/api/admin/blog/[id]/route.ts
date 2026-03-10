import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    const data = await req.json();
    const now = new Date().toISOString();

    const [current] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    await db.update(posts).set({
      titleEn: data.titleEn,
      titleEs: data.titleEs,
      slug: data.slug,
      bodyEn: data.bodyEn,
      bodyEs: data.bodyEs,
      category: data.category,
      featuredImage: data.featuredImage,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      status: data.status,
      author: data.author,
      publishedAt: data.status === "published" && !current.publishedAt ? now : current.publishedAt,
      updatedAt: now,
    }).where(eq(posts.id, id));

    // Replace tags
    await db.delete(postTags).where(eq(postTags.postId, id));
    if (data.tags?.length > 0) {
      await db.insert(postTags).values(
        data.tags.map((sport: string) => ({ postId: id, sport }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    await db.delete(postTags).where(eq(postTags.postId, id));
    await db.delete(posts).where(eq(posts.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
