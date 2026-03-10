import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ valid: false, error: "No code provided" });
    }

    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.code, code.toUpperCase()),
          eq(promoCodes.isActive, true)
        )
      )
      .limit(1);

    if (!promo) {
      return NextResponse.json({ valid: false, error: "Invalid promo code" });
    }

    // Check expiration
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return NextResponse.json({ valid: false, error: "Promo code has expired" });
    }

    // Check max redemptions
    if (promo.maxRedemptions && (promo.currentRedemptions || 0) >= promo.maxRedemptions) {
      return NextResponse.json({ valid: false, error: "Promo code usage limit reached" });
    }

    // Build discount description
    let discountText = "";
    if (promo.discountType === "percent") {
      discountText = `${promo.discountValue}% off`;
    } else if (promo.discountType === "fixed") {
      discountText = `$${promo.discountValue} off`;
    } else if (promo.discountType === "trial_days") {
      discountText = `${promo.discountValue} day free trial`;
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountText,
    });
  } catch (error) {
    console.error("Validate promo error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" });
  }
}
