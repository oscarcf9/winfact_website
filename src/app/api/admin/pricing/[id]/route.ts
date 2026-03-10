import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pricingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// PUT - Update a pricing plan
export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    const fields = [
      "key", "nameEn", "nameEs", "descriptionEn", "descriptionEs",
      "price", "currency", "interval", "ctaEn", "ctaEs",
      "stripePriceId", "trialDays", "isPopular", "badgeEn", "badgeEs",
      "isActive", "isFree", "displayOrder",
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle features arrays — store as JSON strings
    if (body.featuresEn !== undefined) {
      updates.featuresEn = JSON.stringify(body.featuresEn);
    }
    if (body.featuresEs !== undefined) {
      updates.featuresEs = JSON.stringify(body.featuresEs);
    }

    await db.update(pricingPlans).set(updates).where(eq(pricingPlans.id, id));

    const [updated] = await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.id, id));

    if (!updated) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update pricing plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a pricing plan
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    await db.delete(pricingPlans).where(eq(pricingPlans.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete pricing plan error:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
