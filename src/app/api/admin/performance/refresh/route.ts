import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { refreshPerformanceCache } from "@/lib/refresh-performance";
import { sendAdminNotification } from "@/lib/telegram";

export async function POST() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    await refreshPerformanceCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Refresh performance cache error:", error);
    sendAdminNotification(
      `⚠️ <b>Manual performance cache refresh failed</b>\n\nError: ${errorMsg}`
    ).catch(() => {});
    return NextResponse.json({ error: "Failed to refresh cache" }, { status: 500 });
  }
}
