import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { deliveryQueue } from "@/db/schema";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { pickId, channels, scheduledFor } = await req.json();

    if (!pickId || !channels || !scheduledFor) {
      return NextResponse.json({ error: "pickId, channels[], and scheduledFor required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(deliveryQueue).values({
      id,
      pickId,
      channels: JSON.stringify(channels),
      tier: "vip",
      status: "pending",
      scheduledFor,
    });

    return NextResponse.json({ id, scheduledFor });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
  }
}
