import { NextResponse } from "next/server";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public GET — returns active pricing plans for the website
export async function GET() {
  try {
    const plans = await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.isActive, true))
      .orderBy(pricingPlans.displayOrder);

    const result = plans.map((p) => ({
      id: p.id,
      key: p.key,
      nameEn: p.nameEn,
      nameEs: p.nameEs,
      descriptionEn: p.descriptionEn,
      descriptionEs: p.descriptionEs,
      price: p.price,
      currency: p.currency,
      interval: p.interval,
      ctaEn: p.ctaEn,
      ctaEs: p.ctaEs,
      featuresEn: JSON.parse(p.featuresEn || "[]"),
      featuresEs: JSON.parse(p.featuresEs || "[]"),
      trialDays: p.trialDays,
      isPopular: p.isPopular,
      badgeEn: p.badgeEn,
      badgeEs: p.badgeEs,
      isFree: p.isFree,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Public pricing API error:", error);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
