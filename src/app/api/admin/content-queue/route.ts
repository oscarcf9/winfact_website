import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentQueue } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const offset = (page - 1) * PAGE_SIZE;

    const conditions = [];
    if (status) {
      conditions.push(
        eq(contentQueue.status, status as "draft" | "scheduled" | "posted" | "failed")
      );
    }
    if (type) {
      conditions.push(
        eq(contentQueue.type, type as "blog" | "victory_post" | "filler")
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(contentQueue)
        .where(where)
        .orderBy(desc(contentQueue.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(contentQueue)
        .where(where),
    ]);

    return NextResponse.json({
      items,
      total: countResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Content queue GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content queue" },
      { status: 500 }
    );
  }
}
