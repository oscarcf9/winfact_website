import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { postToBufferWithMedia } from "@/lib/buffer";

/**
 * POST /api/admin/blog/share-buffer
 * Share a blog post to all Buffer channels (Facebook, Instagram, Twitter, Threads)
 * with excerpt as caption and featured image.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { caption, imageUrl } = await req.json();

    if (!caption) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    // Post to all channels (same as victory/filler posts — works with images on Facebook)
    const result = await postToBufferWithMedia(caption, imageUrl || undefined);

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: result.error || "Failed to share" }, { status: 500 });
  } catch (error) {
    console.error("[blog/share-buffer] Error:", error);
    return NextResponse.json({ error: "Failed to share to Buffer" }, { status: 500 });
  }
}
