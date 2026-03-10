import { NextResponse } from "next/server";
import {
  getOverallPerformance,
  getSportPerformance,
  getMonthlyPerformance,
} from "@/db/queries/performance";

export async function GET() {
  try {
    const [overall, bySport, monthly] = await Promise.all([
      getOverallPerformance(),
      getSportPerformance(),
      getMonthlyPerformance(),
    ]);

    return NextResponse.json({
      overall,
      bySport,
      monthly,
    });
  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}
