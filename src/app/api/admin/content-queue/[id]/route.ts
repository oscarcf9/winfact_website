import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentQueue } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const updates: Record<string, string> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await db
      .update(contentQueue)
      .set(updates)
      .where(eq(contentQueue.id, id));

    const [updated] = await db
      .select()
      .from(contentQueue)
      .where(eq(contentQueue.id, id))
      .limit(1);

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Content queue PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await context.params;

    const [existing] = await db
      .select()
      .from(contentQueue)
      .where(eq(contentQueue.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.delete(contentQueue).where(eq(contentQueue.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content queue DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
