import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { referrals, users, subscriptions } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * GET /api/admin/referrals
 * Returns referral data grouped by referrer with milestone tracking.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  // Get all referrals
  const allReferrals = await db
    .select()
    .from(referrals)
    .orderBy(desc(referrals.createdAt));

  // Get all referrer user data
  const referrerIds = [...new Set(allReferrals.map((r) => r.referrerId).filter(Boolean))];
  const allUsers =
    referrerIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            stripeCustomerId: users.stripeCustomerId,
          })
          .from(users)
      : [];
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Group referrals by referrer
  const byReferrer = new Map<
    string,
    {
      userId: string;
      email: string;
      name: string | null;
      stripeCustomerId: string | null;
      total: number;
      converted: number;
      rewardsApplied: string[];
      referrals: typeof allReferrals;
    }
  >();

  for (const ref of allReferrals) {
    if (!ref.referrerId) continue;
    const existing = byReferrer.get(ref.referrerId);
    if (existing) {
      existing.total++;
      if (ref.status === "converted") existing.converted++;
      if (ref.rewardApplied && ref.rewardType) existing.rewardsApplied.push(ref.rewardType);
      existing.referrals.push(ref);
    } else {
      const user = userMap.get(ref.referrerId);
      byReferrer.set(ref.referrerId, {
        userId: ref.referrerId,
        email: user?.email || "Unknown",
        name: user?.name || null,
        stripeCustomerId: user?.stripeCustomerId || null,
        total: 1,
        converted: ref.status === "converted" ? 1 : 0,
        rewardsApplied: ref.rewardApplied && ref.rewardType ? [ref.rewardType] : [],
        referrals: [ref],
      });
    }
  }

  // Determine milestones and pending rewards for each referrer
  const MILESTONES = [
    { threshold: 1, reward: "credit_10", label: "$10 Credit" },
    { threshold: 5, reward: "free_month", label: "1 Free Month VIP" },
    { threshold: 10, reward: "vip_discount", label: "Permanent VIP Discount" },
  ];

  const referrers = Array.from(byReferrer.values()).map((r) => {
    const nextMilestone = MILESTONES.find(
      (m) => r.converted >= m.threshold && !r.rewardsApplied.includes(m.reward)
    );
    const pendingRewards = MILESTONES.filter(
      (m) => r.converted >= m.threshold && !r.rewardsApplied.includes(m.reward)
    );
    const nextTarget = MILESTONES.find((m) => r.converted < m.threshold);

    return {
      ...r,
      nextMilestone: nextMilestone || null,
      pendingRewards,
      nextTarget: nextTarget
        ? { threshold: nextTarget.threshold, label: nextTarget.label, progress: r.converted }
        : null,
    };
  });

  // Sort: those with pending rewards first, then by converted count desc
  referrers.sort((a, b) => {
    if (a.pendingRewards.length !== b.pendingRewards.length)
      return b.pendingRewards.length - a.pendingRewards.length;
    return b.converted - a.converted;
  });

  const totalRefs = allReferrals.length;
  const totalConverted = allReferrals.filter((r) => r.status === "converted").length;
  const totalRewarded = allReferrals.filter((r) => r.rewardApplied).length;

  return NextResponse.json({
    stats: {
      total: totalRefs,
      converted: totalConverted,
      rewarded: totalRewarded,
      conversionRate: totalRefs > 0 ? ((totalConverted / totalRefs) * 100).toFixed(1) : "0",
    },
    referrers,
    milestones: MILESTONES,
  });
}
