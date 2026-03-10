import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    return NextResponse.json({ codes });
  } catch {
    return NextResponse.json({ error: "Failed to fetch promos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const id = crypto.randomUUID();
    const code = data.code.toUpperCase();

    // Create Stripe coupon + promotion code
    let stripeCouponId: string | null = null;
    let stripePromotionId: string | null = null;

    try {
      const stripe = getStripe();

      // Build coupon params based on discount type
      const couponParams: Stripe.CouponCreateParams = {
        name: `${code} - ${data.discountType === "percent" ? `${data.discountValue}%` : `$${data.discountValue}`} off`,
        duration: "once",
      };

      if (data.discountType === "percent") {
        couponParams.percent_off = data.discountValue;
      } else if (data.discountType === "fixed") {
        couponParams.amount_off = Math.round(data.discountValue * 100); // cents
        couponParams.currency = "usd";
      } else if (data.discountType === "trial_days") {
        couponParams.percent_off = 100;
        couponParams.name = `${code} - ${data.discountValue} day trial`;
      }

      const coupon = await stripe.coupons.create(couponParams);
      stripeCouponId = coupon.id;

      // Build promotion code params
      const promoParams: Stripe.PromotionCodeCreateParams = {
        promotion: { type: "coupon", coupon: coupon.id },
        code: code,
        active: true,
      };

      if (data.maxRedemptions) {
        promoParams.max_redemptions = data.maxRedemptions;
      }

      if (data.validUntil) {
        promoParams.expires_at = Math.floor(new Date(data.validUntil).getTime() / 1000);
      }

      const promotionCode = await stripe.promotionCodes.create(promoParams);
      stripePromotionId = promotionCode.id;
    } catch (stripeError) {
      console.error("Stripe promo sync error:", stripeError);
      // Still save to DB even if Stripe fails, but log the error
    }

    await db.insert(promoCodes).values({
      id,
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxRedemptions: data.maxRedemptions || null,
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
      applicablePlans: data.applicablePlans ? JSON.stringify(data.applicablePlans) : null,
      isActive: true,
      stripeCouponId,
      stripePromotionId,
    });

    return NextResponse.json({ id, stripeSynced: !!stripePromotionId });
  } catch (error) {
    console.error("Create promo error:", error);
    return NextResponse.json({ error: "Failed to create promo" }, { status: 500 });
  }
}
