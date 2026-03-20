import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentCalendar } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// Whitelist of user-editable calendar fields
const ALLOWED_FIELDS = [
  "title", "type", "stage", "scheduledDate", "assignedTo",
  "linkedPostId", "linkedPickId", "template", "notes", "sport",
] as const;

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    const data = await req.json();

    // Only pick allowed fields from request body
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in data) {
        update[key] = data[key];
      }
    }
    update.updatedAt = new Date().toISOString();

    await db.update(contentCalendar).set(update).where(eq(contentCalendar.id, id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    await db.delete(contentCalendar).where(eq(contentCalendar.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
