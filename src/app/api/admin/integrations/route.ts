import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { apiIntegrations, webhookLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const integrations = await db.select().from(apiIntegrations);
    const recentWebhooks = await db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(50);
    return NextResponse.json({ integrations, recentWebhooks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const existing = await db
      .select()
      .from(apiIntegrations)
      .where(eq(apiIntegrations.name, data.name))
      .then((r) => r[0]);

    if (existing) {
      await db.update(apiIntegrations).set({
        status: data.status || existing.status,
        apiKey: data.apiKey || existing.apiKey,
        config: data.config ? JSON.stringify(data.config) : existing.config,
        updatedAt: new Date().toISOString(),
      }).where(eq(apiIntegrations.id, existing.id));
    } else {
      await db.insert(apiIntegrations).values({
        id: crypto.randomUUID(),
        name: data.name,
        type: data.type,
        status: "disconnected",
        apiKey: data.apiKey || null,
        config: data.config ? JSON.stringify(data.config) : null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}
