import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { referrals, users, subscriptions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { logAdminAction } from "@/lib/audit";

const MILESTONES = [
  { threshold: 1, reward: "credit_10", label: "$10 Credit" },
  { threshold: 5, reward: "free_month", label: "1 Free Month VIP" },
  { threshold: 10, reward: "vip_discount", label: "Permanent VIP Discount" },
];

/**
 * POST /api/admin/referrals/apply-reward
 * Body: { userId: string, rewardType: "credit_10" | "free_month" | "vip_discount" }
 *
 * Applies a referral reward:
 * - credit_10: Adds $10 credit to Stripe customer balance
 * - free_month: Extends subscription by 30 days or creates comp VIP
 * - vip_discount: Creates a permanent 15% coupon for the referrer
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { userId, rewardType } = await req.json();

    if (!userId || !rewardType) {
      return NextResponse.json({ error: "userId and rewardType are required" }, { status: 400 });
    }

    const milestone = MILESTONES.find((m) => m.reward === rewardType);
    if (!milestone) {
      return NextResponse.json({ error: "Invalid reward type" }, { status: 400 });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the user has enough converted referrals for this milestone
    const userReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    const converted = userReferrals.filter((r) => r.status === "converted").length;

    if (converted < milestone.threshold) {
      return NextResponse.json(
        { error: `User only has ${converted} conversions, needs ${milestone.threshold}` },
        { status: 400 }
      );
    }

    // Check if this reward type was already applied
    const alreadyApplied = userReferrals.some(
      (r) => r.rewardApplied && r.rewardType === rewardType
    );
    if (alreadyApplied) {
      return NextResponse.json({ error: "This reward has already been applied" }, { status: 400 });
    }

    // Optimistic lock: atomically claim unrewarded referrals for this milestone.
    // Uses UPDATE ... WHERE rewardApplied = 0 to prevent double-reward race condition
    // between admin panel and webhook handler running concurrently.
    const convertedRefIds = userReferrals
      .filter((r) => r.status === "converted" && !r.rewardApplied)
      .slice(0, milestone.threshold)
      .map((r) => r.id);

    if (convertedRefIds.length < milestone.threshold) {
      return NextResponse.json(
        { error: `Not enough unrewarded referrals to claim. Found ${convertedRefIds.length}, need ${milestone.threshold}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Atomically claim exactly the refs we need — if another process claimed them first, rowsAffected < threshold
    let totalClaimed = 0;
    for (const refId of convertedRefIds) {
      const result = await db
        .update(referrals)
        .set({
          rewardApplied: true,
          rewardType,
          rewardAppliedAt: now,
        })
        .where(
          and(
            eq(referrals.id, refId),
            eq(referrals.rewardApplied, false) // optimistic lock condition
          )
        );
      totalClaimed += result.rowsAffected;
    }

    if (totalClaimed < milestone.threshold) {
      // Race condition: another process claimed some refs between our read and write.
      // The ones we DID claim are already marked — this is safe (partial claim).
      return NextResponse.json(
        { error: "Reward was partially or fully applied by another process. Please refresh and retry." },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    let details = "";

    // Apply the reward based on type
    if (rewardType === "credit_10") {
      // Add $10 credit to Stripe customer balance
      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "User has no Stripe customer ID. They need to subscribe first." },
          { status: 400 }
        );
      }

      await stripe.customers.createBalanceTransaction(user.stripeCustomerId, {
        amount: -1000, // negative = credit (in cents)
        currency: "usd",
        description: "Referral reward: $10 credit for 1 converted referral",
      });
      details = "$10 credit applied to Stripe balance";
    } else if (rewardType === "free_month") {
      // Extend subscription by 30 days or create a comp subscription
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
        )
        .limit(1);

      if (sub && sub.stripeSubscriptionId) {
        // Extend existing subscription by adding 30 days
        // Calculate new end from current period end in our DB
        const currentEndDate = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : new Date();
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + 30);
        const newEndUnix = Math.floor(newEndDate.getTime() / 1000);

        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          trial_end: newEndUnix,
          proration_behavior: "none",
        });

        // Update local DB
        await db
          .update(subscriptions)
          .set({
            currentPeriodEnd: newEndDate.toISOString(),
          })
          .where(eq(subscriptions.id, sub.id));

        details = "Extended subscription by 30 days";
      } else {
        // Create a comp VIP monthly subscription record (no Stripe sub)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId,
          tier: "vip_monthly",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: endDate.toISOString(),
        });

        details = "Created complimentary 30-day VIP subscription";
      }
    } else if (rewardType === "vip_discount") {
      // Create a permanent 15% coupon linked to the referrer
      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "User has no Stripe customer ID. They need to subscribe first." },
          { status: 400 }
        );
      }

      const coupon = await stripe.coupons.create({
        percent_off: 15,
        duration: "forever",
        name: `Referral VIP Discount - ${user.email}`,
        metadata: { referrerId: userId },
      });

      // Apply the coupon as a customer discount
      await stripe.customers.update(user.stripeCustomerId, {
        discount: { coupon: coupon.id },
      } as Parameters<typeof stripe.customers.update>[1]);

      details = `Permanent 15% discount applied (coupon: ${coupon.id})`;
    }

    // Referral records were already atomically claimed above via optimistic locking

    await logAdminAction({
      adminUserId: admin.userId,
      action: "reward_applied",
      targetType: "referral",
      targetId: userId,
      details: { rewardType, milestone: milestone.label, claimedCount: totalClaimed },
      request: req,
    });

    return NextResponse.json({ success: true, details });
  } catch (error) {
    console.error("Apply reward error:", error);
    return NextResponse.json(
      { error: "Failed to apply reward" },
      { status: 500 }
    );
  }
}
