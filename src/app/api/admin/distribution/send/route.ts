import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks, deliveryQueue, deliveryLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPickToTelegram } from "@/lib/telegram";
import { sendPickEmail } from "@/lib/mailerlite";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { pickId, channels, sendNow } = await req.json();

    if (!pickId || !channels || !Array.isArray(channels)) {
      return NextResponse.json({ error: "pickId and channels[] required" }, { status: 400 });
    }

    const pick = await db.select().from(picks).where(eq(picks.id, pickId)).then((r) => r[0]);
    if (!pick) return NextResponse.json({ error: "Pick not found" }, { status: 404 });

    const results: Record<string, { ok: boolean; error?: string }> = {};

    if (sendNow) {
      for (const channel of channels) {
        let result: { ok: boolean; error?: string } = { ok: false, error: "Unknown channel" };

        if (channel === "telegram_free" || channel === "telegram_vip") {
          result = await sendPickToTelegram(pick, channel);
        } else if (channel === "email") {
          result = await sendPickEmail(pick, pick.tier as "free" | "vip");
        }

        results[channel] = result;

        await db.insert(deliveryLogs).values({
          id: crypto.randomUUID(),
          pickId: pick.id,
          channel,
          status: result.ok ? "sent" : "failed",
          metadata: JSON.stringify(result),
          error: result.error || null,
        });
      }
    } else {
      const queueId = crypto.randomUUID();
      await db.insert(deliveryQueue).values({
        id: queueId,
        pickId,
        channels: JSON.stringify(channels),
        tier: pick.tier || "vip",
        status: "pending",
      });
      return NextResponse.json({ queued: true, queueId });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Distribution send error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
