import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// GET - List all pricing plans
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const plans = await db
    .select()
    .from(pricingPlans)
    .orderBy(pricingPlans.displayOrder);

  return NextResponse.json(plans);
}

// POST - Create a new pricing plan
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const id = randomUUID();

    await db.insert(pricingPlans).values({
      id,
      key: body.key,
      nameEn: body.nameEn,
      nameEs: body.nameEs,
      descriptionEn: body.descriptionEn,
      descriptionEs: body.descriptionEs,
      price: body.price,
      currency: body.currency || "USD",
      interval: body.interval,
      ctaEn: body.ctaEn,
      ctaEs: body.ctaEs,
      featuresEn: JSON.stringify(body.featuresEn || []),
      featuresEs: JSON.stringify(body.featuresEs || []),
      stripePriceId: body.stripePriceId || null,
      trialDays: body.trialDays || 0,
      isPopular: body.isPopular || false,
      badgeEn: body.badgeEn || null,
      badgeEs: body.badgeEs || null,
      isActive: body.isActive !== false,
      isFree: body.isFree || false,
      displayOrder: body.displayOrder || 0,
    });

    const [created] = await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.id, id));

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create pricing plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500 }
    );
  }
}
