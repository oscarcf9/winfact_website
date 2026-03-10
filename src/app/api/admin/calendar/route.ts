import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { contentCalendar } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const items = await db.select().from(contentCalendar).orderBy(desc(contentCalendar.scheduledDate)).limit(200);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const id = crypto.randomUUID();

    await db.insert(contentCalendar).values({
      id,
      title: data.title,
      type: data.type,
      stage: data.stage || "idea",
      scheduledDate: data.scheduledDate || null,
      assignedTo: data.assignedTo || null,
      linkedPostId: data.linkedPostId || null,
      linkedPickId: data.linkedPickId || null,
      template: data.template || null,
      notes: data.notes || null,
      sport: data.sport || null,
    });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to create calendar item" }, { status: 500 });
  }
}
