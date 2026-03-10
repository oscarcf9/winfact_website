import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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
