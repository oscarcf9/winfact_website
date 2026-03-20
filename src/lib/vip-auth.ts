import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getActiveSubscription } from "@/db/queries/subscriptions";
import { VIP_TIERS, isVipTier } from "@/lib/constants";
import type { VipTier } from "@/lib/constants";

/**
 * Centralized VIP authorization. All tier checks MUST use this utility —
 * never hardcode tier arrays elsewhere.
 */

/** Returns the canonical list of VIP tiers. Single source of truth. */
export function getVipTiers(): readonly string[] {
  return VIP_TIERS;
}

/** Check if a user has an active VIP subscription. */
export async function requireVip(
  userId: string
): Promise<{ isVip: boolean; tier: string | null }> {
  const subscription = await getActiveSubscription(userId);
  const tier = subscription?.tier ?? null;
  return { isVip: isVipTier(tier), tier };
}

/**
 * Require VIP access or return a 403 response.
 * Use in API routes that should block free users entirely.
 *
 * Usage:
 *   const vip = await requireVipOrThrow();
 *   if (vip.error) return vip.error;
 *   // vip.userId and vip.tier are available
 */
export async function requireVipOrThrow(): Promise<
  | { userId: string; tier: VipTier; error?: never }
  | { userId?: never; tier?: never; error: NextResponse }
> {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { isVip, tier } = await requireVip(userId);

  if (!isVip) {
    return {
      error: NextResponse.json(
        { error: "VIP subscription required" },
        { status: 403 }
      ),
    };
  }

  return { userId, tier: tier as VipTier };
}
