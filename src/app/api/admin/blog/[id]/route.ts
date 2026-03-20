import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/audit";
import { updatePostSchema } from "@/lib/validations";
import { sanitizeBlogHtml } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const now = new Date().toISOString();

    const [current] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    await db.update(posts).set({
      titleEn: data.titleEn,
      titleEs: data.titleEs,
      slug: data.slug,
      bodyEn: data.bodyEn ? sanitizeBlogHtml(data.bodyEn) : data.bodyEn,
      bodyEs: data.bodyEs ? sanitizeBlogHtml(data.bodyEs) : data.bodyEs,
      category: data.category,
      featuredImage: data.featuredImage,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      status: data.status,
      author: data.author,
      publishedAt: data.status === "scheduled" && data.publishedAt
        ? data.publishedAt
        : data.status === "published" && !current.publishedAt
          ? now
          : current.publishedAt,
      updatedAt: now,
    }).where(eq(posts.id, id));

    // Replace tags
    await db.delete(postTags).where(eq(postTags.postId, id));
    if (data.tags && data.tags.length > 0) {
      await db.insert(postTags).values(
        data.tags.map((sport) => ({ postId: id, sport }))
      );
    }

    await logAdminAction({
      adminUserId: admin.userId,
      action: "post_updated",
      targetType: "post",
      targetId: id,
      details: { slug: data.slug, status: data.status },
      request: req,
    });

    revalidatePath("/[locale]/blog", "page");
    revalidatePath(`/[locale]/blog/${data.slug}`, "page");
    // Also revalidate old slug if it changed
    if (current.slug !== data.slug) {
      revalidatePath(`/[locale]/blog/${current.slug}`, "page");
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
    // Get slug before deletion for cache invalidation
    const [postToDelete] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).limit(1);

    await db.delete(postTags).where(eq(postTags.postId, id));
    await db.delete(posts).where(eq(posts.id, id));

    await logAdminAction({
      adminUserId: admin.userId,
      action: "post_deleted",
      targetType: "post",
      targetId: id,
      request: req,
    });

    revalidatePath("/[locale]/blog", "page");
    if (postToDelete?.slug) {
      revalidatePath(`/[locale]/blog/${postToDelete.slug}`, "page");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
