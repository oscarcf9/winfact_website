import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchOdds } from "@/lib/odds-api";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const sport = req.nextUrl.searchParams.get("sport") || "NBA";
    const result = await fetchOdds(sport);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch odds" }, { status: 500 });
  }
}
