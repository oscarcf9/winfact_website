import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * POST /api/admin/picks/settle
 *
 * Admin-authenticated wrapper that triggers the auto-settlement logic.
 * The cron endpoint requires CRON_SECRET Bearer auth which the browser
 * doesn't have, so this endpoint proxies the call server-side.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  try {
    // Call the cron endpoint internally with the proper auth
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/cron/settle-picks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[admin/settle] Error:", error);
    return NextResponse.json(
      { error: "Failed to run auto-settlement" },
      { status: 500 }
    );
  }
}
