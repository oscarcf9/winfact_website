import { db } from "@/db";
import { deliveryQueue, deliveryLogs, picks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPickToTelegram } from "./telegram";
import { sendPickEmail } from "./mailerlite";

type ChannelType = "telegram_free" | "telegram_vip" | "email" | "push" | "sms";

export async function processDeliveryQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Get pending items that are due
  const pending = await db
    .select()
    .from(deliveryQueue)
    .where(
      and(
        eq(deliveryQueue.status, "pending"),
        // scheduledFor is null (send now) or <= now
      )
    )
    .limit(50);

  // Filter for items that are due
  const due = pending.filter(
    (item) => !item.scheduledFor || item.scheduledFor <= now
  );

  for (const item of due) {
    processed++;

    // Mark as processing
    await db
      .update(deliveryQueue)
      .set({ status: "processing" })
      .where(eq(deliveryQueue.id, item.id));

    // Get the pick
    const pick = item.pickId
      ? await db.select().from(picks).where(eq(picks.id, item.pickId)).then((r) => r[0])
      : null;

    if (!pick) {
      await db
        .update(deliveryQueue)
        .set({ status: "failed", error: "Pick not found", processedAt: now })
        .where(eq(deliveryQueue.id, item.id));
      errors.push(`Pick not found for queue item ${item.id}`);
      failed++;
      continue;
    }

    const channels: ChannelType[] = JSON.parse(item.channels || "[]");
    let allOk = true;

    for (const channel of channels) {
      let result: { ok: boolean; error?: string; messageId?: number; campaignId?: string } = {
        ok: false,
        error: "Unknown channel",
      };

      if (channel === "telegram_free" || channel === "telegram_vip") {
        result = await sendPickToTelegram(pick, channel);
      } else if (channel === "email") {
        result = await sendPickEmail(pick, item.tier as "free" | "vip");
      }
      // push and sms are future implementations

      // Log the delivery attempt
      await db.insert(deliveryLogs).values({
        id: crypto.randomUUID(),
        pickId: pick.id,
        queueId: item.id,
        channel,
        status: result.ok ? "sent" : "failed",
        metadata: JSON.stringify({
          messageId: result.messageId,
          campaignId: result.campaignId,
        }),
        error: result.error || null,
      });

      if (!result.ok) {
        allOk = false;
        errors.push(`${channel}: ${result.error}`);
      }
    }

    // Update queue status
    await db
      .update(deliveryQueue)
      .set({
        status: allOk ? "completed" : "failed",
        processedAt: now,
        error: allOk ? null : errors.slice(-channels.length).join("; "),
      })
      .where(eq(deliveryQueue.id, item.id));

    if (allOk) succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed, errors };
}

export async function queuePickDelivery(
  pickId: string,
  channels: ChannelType[],
  tier: "free" | "vip",
  scheduledFor?: string
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(deliveryQueue).values({
    id,
    pickId,
    channels: JSON.stringify(channels),
    tier,
    status: "pending",
    scheduledFor: scheduledFor || null,
  });
  return id;
}

export async function cancelDelivery(queueId: string): Promise<boolean> {
  await db
    .update(deliveryQueue)
    .set({ status: "cancelled" })
    .where(and(eq(deliveryQueue.id, queueId), eq(deliveryQueue.status, "pending")));
  return true;
}

export function getDefaultChannels(tier: "free" | "vip"): ChannelType[] {
  if (tier === "free") return ["telegram_free", "email"];
  return ["telegram_free", "telegram_vip", "email"];
}
