import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { deleteFromR2, getKeyFromUrl, isR2Configured } from "@/lib/r2";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const rows = await db
      .select()
      .from(media)
      .orderBy(desc(media.uploadedAt))
      .limit(200);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Get media error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Get the media record to find the URL before deleting
    const [record] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete from R2 if configured
    if (isR2Configured() && record.url) {
      const key = getKeyFromUrl(record.url);
      if (key) {
        try {
          await deleteFromR2(key);
        } catch (err) {
          console.error("R2 delete error (non-blocking):", err);
        }
      }
    }

    // Delete DB record
    await db.delete(media).where(eq(media.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
