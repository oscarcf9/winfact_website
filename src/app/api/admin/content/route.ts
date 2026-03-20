import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSiteContent } from "@/db/queries/site-content";
import { siteContentSchema } from "@/lib/validations";
import { sanitizeSiteContent } from "@/lib/sanitize";

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const parsed = siteContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { key, value } = parsed.data;
    await upsertSiteContent(key, sanitizeSiteContent(value));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
