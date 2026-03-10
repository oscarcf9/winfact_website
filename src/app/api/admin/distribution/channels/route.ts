import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { channelConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const configs = await db.select().from(channelConfigs);
    return NextResponse.json({ configs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { channel, enabled, config } = await req.json();

    const existing = await db
      .select()
      .from(channelConfigs)
      .where(eq(channelConfigs.channel, channel))
      .then((r) => r[0]);

    if (existing) {
      await db
        .update(channelConfigs)
        .set({ enabled, config: JSON.stringify(config), updatedAt: new Date().toISOString() })
        .where(eq(channelConfigs.id, existing.id));
    } else {
      await db.insert(channelConfigs).values({
        id: crypto.randomUUID(),
        channel,
        enabled,
        config: JSON.stringify(config),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}
