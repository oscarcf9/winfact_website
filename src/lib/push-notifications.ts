import { db } from "@/db";
import { pushTokens, subscriptions } from "@/db/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushToAll(payload: PushPayload) {
  const tokens = await db.select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.active, 1));
  if (tokens.length === 0) return;
  await sendExpoPushNotifications(tokens.map(t => t.token), payload);
}

export async function sendPushToTier(tier: 'free' | 'vip', payload: PushPayload) {
  // Get user IDs with active VIP subscriptions
  const vipUsers = await db.select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(and(
      inArray(subscriptions.tier, ['vip_weekly', 'vip_monthly', 'season_pass']),
      inArray(subscriptions.status, ['active', 'trialing'])
    ));
  const vipUserIds = vipUsers.map(u => u.userId).filter(Boolean) as string[];

  let tokens: { token: string }[];
  if (tier === 'vip' && vipUserIds.length > 0) {
    tokens = await db.select({ token: pushTokens.token })
      .from(pushTokens)
      .where(and(
        eq(pushTokens.active, 1),
        inArray(pushTokens.userId, vipUserIds)
      ));
  } else if (tier === 'free') {
    if (vipUserIds.length > 0) {
      tokens = await db.select({ token: pushTokens.token })
        .from(pushTokens)
        .where(and(
          eq(pushTokens.active, 1),
          notInArray(pushTokens.userId, vipUserIds)
        ));
    } else {
      tokens = await db.select({ token: pushTokens.token })
        .from(pushTokens)
        .where(eq(pushTokens.active, 1));
    }
  } else {
    return; // No VIP users, nothing to send
  }

  if (tokens.length === 0) return;
  await sendExpoPushNotifications(tokens.map(t => t.token), payload);
}

async function sendExpoPushNotifications(tokens: string[], payload: PushPayload) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  }));

  // Send in chunks of 100 (Expo API limit)
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();

      // Deactivate invalid tokens
      if (result.data) {
        for (let j = 0; j < result.data.length; j++) {
          if (result.data[j].status === 'error' &&
              result.data[j].details?.error === 'DeviceNotRegistered') {
            await db.update(pushTokens)
              .set({ active: 0, updatedAt: Math.floor(Date.now() / 1000) })
              .where(eq(pushTokens.token, chunk[j].to));
          }
        }
      }
    } catch (err) {
      console.error('Push notification send failed:', err);
    }
  }
}
