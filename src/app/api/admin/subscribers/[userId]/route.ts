import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe, PLANS } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";

type Params = { params: Promise<{ userId: string }> };

// PATCH - Update subscriber notes
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { userId } = await params;
    const { notes } = await req.json();

    await db
      .update(users)
      .set({ notes, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update subscriber error:", error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}

// POST - Subscriber actions (cancel, comp, change_tier, extend, refund)
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  // Rate limit: 10 admin actions per minute (protects financial operations)
  const { success } = await rateLimit(req, { prefix: "admin-action", maxRequests: 10, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { userId } = await params;
    const body = await req.json();
    const action = body.action as string;

    // Get user and subscription
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    switch (action) {
      case "cancel": {
        if (!sub?.stripeSubscriptionId) {
          return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
        }

        // Don't cancel comp subscriptions via Stripe
        if (sub.stripeSubscriptionId.startsWith("comp_")) {
          await db
            .update(subscriptions)
            .set({ status: "cancelled" })
            .where(eq(subscriptions.id, sub.id));
        } else {
          await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
          await db
            .update(subscriptions)
            .set({ status: "cancelled" })
            .where(eq(subscriptions.id, sub.id));
        }

        return NextResponse.json({ ok: true, action: "cancelled" });
      }

      case "comp": {
        const days = body.days || 30;
        const compId = `comp_${userId}_${Date.now()}`;
        const now = new Date();
        const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        if (sub) {
          // Update existing subscription
          await db
            .update(subscriptions)
            .set({
              tier: "vip_monthly",
              status: "active",
              stripeSubscriptionId: compId,
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: endDate.toISOString(),
            })
            .where(eq(subscriptions.id, sub.id));
        } else {
          // Create new subscription record
          await db.insert(subscriptions).values({
            id: compId,
            userId,
            stripeSubscriptionId: compId,
            tier: "vip_monthly",
            status: "active",
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: endDate.toISOString(),
          });
        }

        return NextResponse.json({ ok: true, action: "comped", days });
      }

      case "change_tier": {
        const newTier = body.tier as string;
        const validTiers = ["free", "vip_weekly", "vip_monthly", "season_pass"] as const;
        type Tier = typeof validTiers[number];
        if (!validTiers.includes(newTier as Tier)) {
          return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
        }
        const typedTier = newTier as Tier;

        if (!sub?.stripeSubscriptionId || sub.stripeSubscriptionId.startsWith("comp_")) {
          // For comp subscriptions, just update the tier in DB
          if (sub) {
            await db
              .update(subscriptions)
              .set({ tier: typedTier })
              .where(eq(subscriptions.id, sub.id));
          }
          return NextResponse.json({ ok: true, action: "tier_changed", tier: typedTier });
        }

        // For real Stripe subscriptions, update via Stripe API
        const plan = PLANS[newTier];
        if (!plan) {
          return NextResponse.json({ error: "No Stripe price for tier" }, { status: 400 });
        }
        const stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);
        await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
          items: [
            {
              id: stripeSub.items.data[0].id,
              price: plan.priceId,
            },
          ],
        });

        await db
          .update(subscriptions)
          .set({ tier: typedTier })
          .where(eq(subscriptions.id, sub.id));

        return NextResponse.json({ ok: true, action: "tier_changed", tier: typedTier });
      }

      case "extend": {
        const extendDays = body.days || 30;
        if (!sub) {
          return NextResponse.json({ error: "No subscription found" }, { status: 400 });
        }

        const currentEnd = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : new Date();
        const newEnd = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);

        if (sub.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith("comp_")) {
          // For Stripe subscriptions, use trial_end to extend
          try {
            await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
              trial_end: Math.floor(newEnd.getTime() / 1000),
            });
          } catch (stripeError) {
            console.error("Stripe extend error:", stripeError);
            // Still update locally even if Stripe fails
          }
        }

        await db
          .update(subscriptions)
          .set({ currentPeriodEnd: newEnd.toISOString() })
          .where(eq(subscriptions.id, sub.id));

        return NextResponse.json({ ok: true, action: "extended", newEnd: newEnd.toISOString() });
      }

      case "refund": {
        if (!sub?.stripeSubscriptionId || sub.stripeSubscriptionId.startsWith("comp_")) {
          return NextResponse.json({ error: "No Stripe subscription to refund" }, { status: 400 });
        }

        // Get the latest invoice for this subscription
        const invoices = await getStripe().invoices.list({
          subscription: sub.stripeSubscriptionId,
          limit: 1,
        });

        const latestInvoice = invoices.data[0];
        if (!latestInvoice) {
          return NextResponse.json({ error: "No payment found to refund" }, { status: 400 });
        }

        // Guard against double-refunding: check if this invoice was already refunded
        const maxRefundable = latestInvoice.amount_paid || 0;
        if (maxRefundable <= 0) {
          return NextResponse.json({ error: "Invoice has no paid amount to refund" }, { status: 400 });
        }

        // Find payment intent from invoice payments
        let paymentIntentId: string | null = null;

        if (latestInvoice.payments?.data?.length) {
          const invoicePayment = latestInvoice.payments.data[0];
          const paymentData = invoicePayment.payment;
          if (paymentData?.payment_intent) {
            paymentIntentId = typeof paymentData.payment_intent === "string"
              ? paymentData.payment_intent
              : paymentData.payment_intent.id;
          }
        }

        if (!paymentIntentId) {
          return NextResponse.json({ error: "No payment intent found for refund" }, { status: 400 });
        }

        // Check existing refunds on this payment intent to prevent over-refunding
        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
        const alreadyRefunded = paymentIntent.amount_received - (paymentIntent.amount_received - (paymentIntent.amount || 0));
        const existingRefunds = await getStripe().refunds.list({ payment_intent: paymentIntentId, limit: 100 });
        const totalRefunded = existingRefunds.data
          .filter((r) => r.status !== "failed" && r.status !== "canceled")
          .reduce((sum, r) => sum + r.amount, 0);
        const remainingRefundable = maxRefundable - totalRefunded;

        if (remainingRefundable <= 0) {
          return NextResponse.json({ error: "This payment has already been fully refunded" }, { status: 400 });
        }

        const refundParams: { payment_intent: string; amount?: number } = {
          payment_intent: paymentIntentId,
        };

        // Validate refund amount if specified
        if (body.amount) {
          const refundAmountCents = Math.round(body.amount * 100);

          if (refundAmountCents <= 0) {
            return NextResponse.json({ error: "Invalid refund amount" }, { status: 400 });
          }

          if (refundAmountCents > remainingRefundable) {
            return NextResponse.json(
              { error: `Refund amount exceeds maximum refundable. Maximum: $${(remainingRefundable / 100).toFixed(2)}` },
              { status: 400 }
            );
          }

          refundParams.amount = refundAmountCents;
        }

        const refund = await getStripe().refunds.create(refundParams);

        await logAdminAction({
          adminUserId: admin.userId,
          action: "subscriber_refunded",
          targetType: "subscriber",
          targetId: userId,
          details: { refundId: refund.id, amount: refund.amount / 100, subscriptionId: sub.stripeSubscriptionId },
          request: req,
        });

        return NextResponse.json({
          ok: true,
          action: "refunded",
          refundId: refund.id,
          amount: refund.amount / 100,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Subscriber action error:", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
