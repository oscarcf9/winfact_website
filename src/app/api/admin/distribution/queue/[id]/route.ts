import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { deliveryQueue } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    await db
      .update(deliveryQueue)
      .set({ status: "cancelled" })
      .where(and(eq(deliveryQueue.id, id), eq(deliveryQueue.status, "pending")));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
