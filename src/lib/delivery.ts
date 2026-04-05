import { db } from "@/db";
import { deliveryQueue, deliveryLogs, picks } from "@/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { sendPickToTelegram, sendVipTeaserToTelegram, sendAdminNotification } from "./telegram";
import { sendPickEmail } from "./mailerlite";
import { withRetry } from "./retry";
import { sendPushToAll, sendPushToTier } from "./push-notifications";

type ChannelType = "telegram_free" | "telegram_vip" | "email" | "push" | "sms";

/**
 * Recover items stuck in 'processing' for more than 10 minutes.
 * These are likely from a previous cron run that crashed.
 */
async function recoverStaleClaims() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await db
    .update(deliveryQueue)
    .set({ status: "pending", batchId: null, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(deliveryQueue.status, "processing"),
        lt(deliveryQueue.updatedAt, tenMinutesAgo)
      )
    );
}

/**
 * Atomically claim a batch of pending delivery items.
 * Uses UPDATE ... WHERE to prevent two concurrent cron runs from claiming the same items.
 */
async function claimDeliveryBatch(batchSize: number = 50): Promise<string> {
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Atomically claim unclaimed pending items
  await db
    .update(deliveryQueue)
    .set({ status: "processing", batchId, updatedAt: now })
    .where(
      and(
        eq(deliveryQueue.status, "pending"),
        isNull(deliveryQueue.batchId)
      )
    );

  return batchId;
}

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

  // Step 1: Recover stale claims from crashed previous runs
  await recoverStaleClaims();

  // Step 2: Atomically claim a batch
  const batchId = await claimDeliveryBatch(50);

  // Step 3: Fetch only our claimed items
  const claimed = await db
    .select()
    .from(deliveryQueue)
    .where(eq(deliveryQueue.batchId, batchId));

  // Filter for items that are due
  const due = claimed.filter(
    (item) => !item.scheduledFor || item.scheduledFor <= now
  );

  // Reset items that aren't due yet back to pending
  const notDue = claimed.filter(
    (item) => item.scheduledFor && item.scheduledFor > now
  );
  for (const item of notDue) {
    await db
      .update(deliveryQueue)
      .set({ status: "pending", batchId: null, updatedAt: now })
      .where(eq(deliveryQueue.id, item.id));
  }

  for (const item of due) {
    processed++;

    // Get the pick
    const pick = item.pickId
      ? await db.select().from(picks).where(eq(picks.id, item.pickId)).then((r) => r[0])
      : null;

    if (!pick) {
      await db
        .update(deliveryQueue)
        .set({ status: "failed", error: "Pick not found", processedAt: now, updatedAt: now })
        .where(eq(deliveryQueue.id, item.id));
      errors.push(`Pick not found for queue item ${item.id}`);
      failed++;
      continue;
    }

    const channels: ChannelType[] = JSON.parse(item.channels || "[]");
    const channelResults: { channel: string; ok: boolean; error?: string }[] = [];

    for (const channel of channels) {
      let result: { ok: boolean; error?: string; messageId?: number; campaignId?: string } = {
        ok: false,
        error: "Unknown channel",
      };

      try {
        if (channel === "telegram_free" && pick.tier === "vip") {
          result = await sendVipTeaserToTelegram(pick);
        } else if (channel === "telegram_free" || channel === "telegram_vip") {
          result = await sendPickToTelegram(pick, channel);
        } else if (channel === "email") {
          result = await sendPickEmail(pick, item.tier as "free" | "vip");
        }
      } catch (err) {
        result = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

      channelResults.push({ channel, ok: result.ok, error: result.error });

      // Log the delivery attempt per channel
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
        errors.push(`${channel}: ${result.error}`);
      }
    }

    const allOk = channelResults.every((r) => r.ok);
    const anyOk = channelResults.some((r) => r.ok);
    const failedChannels = channelResults.filter((r) => !r.ok).map((r) => r.channel);

    // Mark as completed if all succeeded, partial if some succeeded,
    // or failed if none succeeded. Store which channels failed for targeted retry.
    await db
      .update(deliveryQueue)
      .set({
        status: allOk ? "completed" : anyOk ? "completed" : "failed",
        processedAt: now,
        updatedAt: now,
        error: allOk ? null : `Failed channels: ${failedChannels.join(", ")}`,
      })
      .where(eq(deliveryQueue.id, item.id));

    if (allOk) succeeded++;
    else if (anyOk) { succeeded++; } // Partial success counts as succeeded — failures are logged per channel
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

/**
 * Distribute a pick immediately based on its tier.
 * - FREE: full pick → Telegram free group + email to free subscribers
 * - VIP: teaser → Telegram free group + full pick email to VIP subscribers only
 *
 * Fire-and-forget — logs results but never throws.
 */
export async function distributePickOnPublish(
  pickId: string,
  pickData: {
    sport: string;
    matchup: string;
    pickText: string;
    odds?: number | null;
    units?: number | null;
    confidence?: string | null;
    stars?: number | null;
    analysisEn?: string | null;
    analysisEs?: string | null;
    tier?: string | null;
    modelEdge?: number | null;
  }
): Promise<void> {
  const tier = (pickData.tier as "free" | "vip") || "vip";

  // Helper: send a result (success or final failure) and alert admin on failure
  async function deliverChannel(
    channel: "telegram_free" | "telegram_vip" | "email" | "push" | "sms",
    send: () => Promise<{ ok: boolean; messageId?: number; campaignId?: string; error?: string }>
  ) {
    let result: { ok: boolean; messageId?: number; campaignId?: string; error?: string };

    try {
      result = await withRetry(
        async () => {
          const r = await send();
          // Treat API-level failures (ok: false) as errors so retry kicks in
          if (!r.ok) throw new Error(r.error || `${channel} send failed`);
          return r;
        },
        { label: `distribution_${channel}`, maxAttempts: 3, backoffMs: 2000 }
      );
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };

      // Alert admin that distribution failed after all retries
      try {
        await sendAdminNotification(
          `⚠️ *DISTRIBUTION FAILED*\n\nPick: ${pickData.matchup}\nChannel: ${channel}\nError: ${result.error}\n\nManually resend from admin panel.`
        );
      } catch {
        console.error("[distribution] Admin alert also failed");
      }
    }

    // Log delivery attempt
    await db.insert(deliveryLogs).values({
      id: crypto.randomUUID(),
      pickId,
      channel,
      status: result.ok ? "sent" : "failed",
      metadata: JSON.stringify({
        messageId: result.messageId,
        campaignId: result.campaignId,
        type: channel === "telegram_free" && tier === "vip" ? "teaser" : "full",
      }),
      error: result.error || null,
    }).catch(() => {});
  }

  try {
    // 1. Telegram
    if (tier === "vip") {
      await deliverChannel("telegram_free", () => sendVipTeaserToTelegram(pickData));
    } else {
      await deliverChannel("telegram_free", () => sendPickToTelegram(pickData, "telegram_free"));
    }

    // 2. Email — send to appropriate tier segment
    await deliverChannel("email", () => sendPickEmail(pickData, tier));

    // 3. Push notifications
    await deliverChannel("push", async () => {
      try {
        if (tier === "free") {
          await sendPushToAll({
            title: `New ${pickData.sport} Pick`,
            body: `${pickData.matchup} — ${pickData.pickText}${pickData.odds ? ` (${pickData.odds > 0 ? '+' : ''}${pickData.odds})` : ''}`,
            data: { pickId, screen: 'pick' },
          });
        } else {
          // Full notification to VIP users
          await sendPushToTier('vip', {
            title: `New VIP ${pickData.sport} Pick`,
            body: `${pickData.matchup} — ${pickData.pickText}${pickData.odds ? ` (${pickData.odds > 0 ? '+' : ''}${pickData.odds})` : ''}`,
            data: { pickId, screen: 'pick' },
          });
          // Teaser to free users
          await sendPushToTier('free', {
            title: `VIP Pick Available`,
            body: `A new ${pickData.sport} VIP pick just dropped. Upgrade to unlock it.`,
            data: { screen: 'upgrade' },
          });
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    });
  } catch (error) {
    console.error("Distribution error (non-blocking):", error);
  }
}
