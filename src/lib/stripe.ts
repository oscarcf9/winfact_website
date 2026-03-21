import Stripe from "stripe";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

// Static fallback plans (used when DB has no plans yet)
export const PLANS: Record<string, {
  name: string;
  priceId: string;
  price: number;
  interval: string;
  trialDays: number;
}> = {
  vip_weekly: {
    name: "VIP Weekly",
    priceId: process.env.STRIPE_VIP_WEEKLY_PRICE_ID!,
    price: 45,
    interval: "week",
    trialDays: 0,
  },
  vip_monthly: {
    name: "VIP Monthly",
    priceId: process.env.STRIPE_VIP_MONTHLY_PRICE_ID!,
    price: 120,
    interval: "month",
    trialDays: 0,
  },
};

export type PlanKey = string;

/**
 * Get a plan from the DB by key, falling back to PLANS constant.
 * Used at checkout time to resolve Stripe price IDs.
 */
export async function getPlanByKey(key: string) {
  const [dbPlan] = await db
    .select()
    .from(pricingPlans)
    .where(and(eq(pricingPlans.key, key), eq(pricingPlans.isActive, true)))
    .limit(1);

  if (dbPlan && dbPlan.stripePriceId) {
    return {
      name: dbPlan.nameEn,
      priceId: dbPlan.stripePriceId,
      price: dbPlan.price,
      interval: dbPlan.interval,
      trialDays: dbPlan.trialDays || 0,
    };
  }

  // Fallback to static PLANS
  return PLANS[key] || null;
}
