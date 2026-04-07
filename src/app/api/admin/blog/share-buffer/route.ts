import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { postBlogLinkToBuffer } from "@/lib/buffer";

/**
 * POST /api/admin/blog/share-buffer
 * Share a blog post to Facebook via Buffer with excerpt caption and image.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { caption, imageUrl } = await req.json();

    if (!caption) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    const result = await postBlogLinkToBuffer(caption, imageUrl || undefined);

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: result.error || "Failed to share" }, { status: 500 });
  } catch (error) {
    console.error("[blog/share-buffer] Error:", error);
    return NextResponse.json({ error: "Failed to share to Buffer" }, { status: 500 });
  }
}
