import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { refreshPerformanceCache } from "@/lib/refresh-performance";

export async function POST() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    await refreshPerformanceCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Refresh performance cache error:", error);
    return NextResponse.json({ error: "Failed to refresh cache" }, { status: 500 });
  }
}
