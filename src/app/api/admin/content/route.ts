import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSiteContent } from "@/db/queries/site-content";
import { siteContentSchema } from "@/lib/validations";
import { sanitizeSiteContent } from "@/lib/sanitize";
import { db } from "@/db";
import { contentQueue } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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
    const cleanValue = sanitizeSiteContent(value);
    await upsertSiteContent(key, cleanValue);

    // Side effect: turning the filler toggle OFF must immediately KILL pending
    // posts. Without this, /api/cron/process-content-queue keeps draining
    // already-queued filler rows long after the admin disabled it (which is
    // exactly how a "disable" can still produce posts at 2 AM).
    let cancelled = 0;
    if (key === "filler_content_enabled" && cleanValue !== "true") {
      const result = await db
        .update(contentQueue)
        .set({ status: "failed", error: "cancelled_by_admin_toggle" })
        .where(
          and(
            eq(contentQueue.type, "filler"),
            inArray(contentQueue.status, ["draft", "scheduled", "processing"])
          )
        )
        .returning({ id: contentQueue.id });
      cancelled = result.length;
    }

    return NextResponse.json({ success: true, cancelled });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
