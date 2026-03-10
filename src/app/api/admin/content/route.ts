import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSiteContent } from "@/db/queries/site-content";

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });
    await upsertSiteContent(key, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
