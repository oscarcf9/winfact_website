// No GET handler — the admin blog list page fetches posts server-side via direct DB query.
// Only POST (create) is exposed here. PUT/DELETE are in /api/admin/blog/[id]/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/audit";
import { createPostSchema } from "@/lib/validations";
import { sanitizeBlogHtml } from "@/lib/sanitize";

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    await db.delete(postTags);
    await db.delete(posts);

    await logAdminAction({
      adminUserId: admin.userId,
      action: "all_posts_deleted",
      targetType: "post",
      targetId: "all",
      request: req,
    });

    revalidatePath("/[locale]/blog", "page");

    return NextResponse.json({ success: true, message: "All blog posts deleted" });
  } catch (error) {
    console.error("Bulk delete posts error:", error);
    return NextResponse.json({ error: "Failed to delete all posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Check slug uniqueness
    const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, data.slug)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(posts).values({
      id,
      slug: data.slug,
      titleEn: data.titleEn,
      titleEs: data.titleEs || null,
      bodyEn: sanitizeBlogHtml(data.bodyEn),
      bodyEs: data.bodyEs ? sanitizeBlogHtml(data.bodyEs) : null,
      category: data.category,
      featuredImage: data.featuredImage || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      status: data.status || "draft",
      publishedAt: data.status === "scheduled" && data.publishedAt
        ? data.publishedAt
        : data.status === "published"
          ? now
          : null,
      author: data.author || "WinFact",
    });

    if (data.tags && data.tags.length > 0) {
      await db.insert(postTags).values(
        data.tags.map((sport) => ({ postId: id, sport }))
      );
    }

    await logAdminAction({
      adminUserId: admin.userId,
      action: "post_created",
      targetType: "post",
      targetId: id,
      details: { slug: data.slug, category: data.category, status: data.status || "draft" },
      request: req,
    });

    // Revalidate blog pages when a post is created
    revalidatePath("/[locale]/blog", "page");
    if (data.status === "published") {
      revalidatePath(`/[locale]/blog/${data.slug}`, "page");
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
