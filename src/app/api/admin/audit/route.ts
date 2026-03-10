import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pickAuditLog } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const pickId = req.nextUrl.searchParams.get("pickId");
    let logs;

    if (pickId) {
      logs = await db.select().from(pickAuditLog).where(eq(pickAuditLog.pickId, pickId)).orderBy(desc(pickAuditLog.createdAt));
    } else {
      logs = await db.select().from(pickAuditLog).orderBy(desc(pickAuditLog.createdAt)).limit(200);
    }

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
