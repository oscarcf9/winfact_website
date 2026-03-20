import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getOverallPerformance,
  getSportPerformance,
  getMonthlyPerformance,
} from "@/db/queries/performance";

// Performance data is admin-only — not exposed publicly.
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const [overall, bySport, monthly] = await Promise.all([
      getOverallPerformance(),
      getSportPerformance(),
      getMonthlyPerformance(),
    ]);

    return NextResponse.json({ overall, bySport, monthly });
  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}
