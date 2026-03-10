import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSettledPicks } from "@/db/queries/picks";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const sport = searchParams.get("sport") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const picks = await getSettledPicks({ sport, limit });

    return NextResponse.json({ picks, count: picks.length });
  } catch (error) {
    console.error("Pick history API error:", error);
    return NextResponse.json({ error: "Failed to fetch pick history" }, { status: 500 });
  }
}
