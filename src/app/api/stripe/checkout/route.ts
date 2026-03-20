import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getStripe, PLANS, PlanKey, getPlanByKey } from "@/lib/stripe";
import { db } from "@/db";
import { users, promoCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SITE_URL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 checkout attempts per minute per IP
    const { success } = await rateLimit(req, { prefix: "checkout", maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const plan = parsed.data.plan as PlanKey;
    const promoCode = parsed.data.promoCode;

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
      automatic_tax: { enabled: true },
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

    // Apply promo code if provided — validate limits server-side before creating session
    if (promoCode) {
      const upperCode = promoCode.toUpperCase();

      // First try to find in app DB for the Stripe promotion code ID
      const [appPromo] = await db
        .select()
        .from(promoCodes)
        .where(
          and(
            eq(promoCodes.code, upperCode),
            eq(promoCodes.isActive, true)
          )
        )
        .limit(1);

      // Server-side validation of promo code limits
      if (appPromo) {
        // Check expiration
        if (appPromo.validUntil && new Date(appPromo.validUntil) < new Date()) {
          return NextResponse.json({ error: "Promo code has expired" }, { status: 400 });
        }
        // Check validFrom — prevent future promos from being used early
        if (appPromo.validFrom && new Date(appPromo.validFrom) > new Date()) {
          return NextResponse.json({ error: "Promo code is not yet active" }, { status: 400 });
        }
        // Check max redemptions
        if (appPromo.maxRedemptions && (appPromo.currentRedemptions || 0) >= appPromo.maxRedemptions) {
          return NextResponse.json({ error: "Promo code usage limit reached" }, { status: 400 });
        }
      }

      let stripePromoId: string | null = null;

      if (appPromo?.stripePromotionId) {
        stripePromoId = appPromo.stripePromotionId;
      } else {
        // Fallback: search Stripe directly for codes not created via admin
        const promotionCodes = await getStripe().promotionCodes.list({
          code: upperCode,
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
        sessionParams.metadata!.promoCode = upperCode;
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
