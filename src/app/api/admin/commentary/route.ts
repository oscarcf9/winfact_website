import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { commentaryLog } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { searchParams } = req.nextUrl;
    const sport = searchParams.get("sport") || "";
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));

    const conditions = sport && sport !== "All"
      ? eq(commentaryLog.sport, sport)
      : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(commentaryLog)
      .where(conditions);

    const total = countResult?.count ?? 0;

    const entries = await db
      .select()
      .from(commentaryLog)
      .where(conditions)
      .orderBy(desc(commentaryLog.postedAt))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE);

    return NextResponse.json({ entries, total, page });
  } catch (error) {
    console.error("Commentary fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch commentary log" },
      { status: 500 }
    );
  }
}
