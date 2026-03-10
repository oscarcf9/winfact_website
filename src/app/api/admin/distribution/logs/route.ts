import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { deliveryLogs, deliveryQueue } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const logs = await db
      .select()
      .from(deliveryLogs)
      .orderBy(desc(deliveryLogs.sentAt))
      .limit(100);

    const queue = await db
      .select()
      .from(deliveryQueue)
      .orderBy(desc(deliveryQueue.createdAt))
      .limit(50);

    return NextResponse.json({ logs, queue });
  } catch (error) {
    console.error("Logs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
