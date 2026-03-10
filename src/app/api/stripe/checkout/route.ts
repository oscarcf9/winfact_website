import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getStripe, PLANS, PlanKey, getPlanByKey } from "@/lib/stripe";
import { db } from "@/db";
import { users, promoCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SITE_URL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const plan = body.plan as PlanKey;
    const promoCode = body.promoCode as string | undefined;

    // Try DB first, then fallback to static PLANS
    const selectedPlan = await getPlanByKey(plan);
    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get or create Stripe customer
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        metadata: { clerkUserId: userId },
        email: user?.email,
      });
      customerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId));
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/en/dashboard?checkout=success`,
      cancel_url: `${SITE_URL}/en/pricing?checkout=cancelled`,
      subscription_data: {
        trial_period_days: selectedPlan.trialDays,
        metadata: { clerkUserId: userId, plan },
      },
      metadata: { clerkUserId: userId, plan },
    };

    // Apply promo code if provided
    if (promoCode) {
      // First try to find in app DB for the Stripe promotion code ID
      const [appPromo] = await db
        .select()
        .from(promoCodes)
        .where(
          and(
            eq(promoCodes.code, promoCode.toUpperCase()),
            eq(promoCodes.isActive, true)
          )
        )
        .limit(1);

      let stripePromoId: string | null = null;

      if (appPromo?.stripePromotionId) {
        stripePromoId = appPromo.stripePromotionId;
      } else {
        // Fallback: search Stripe directly for codes not created via admin
        const promotionCodes = await getStripe().promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });
        if (promotionCodes.data.length > 0) {
          stripePromoId = promotionCodes.data[0].id;
        }
      }

      if (stripePromoId) {
        sessionParams.discounts = [
          { promotion_code: stripePromoId },
        ];
        // Remove trial if discount is applied
        delete sessionParams.subscription_data!.trial_period_days;
        // Store promo code in metadata for webhook to increment redemptions
        sessionParams.metadata!.promoCode = promoCode.toUpperCase();
      }
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
