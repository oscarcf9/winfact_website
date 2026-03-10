import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    const data = await req.json();

    // If toggling active status, sync to Stripe
    if (data.isActive !== undefined) {
      const [existing] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.id, id))
        .limit(1);

      if (existing?.stripePromotionId) {
        try {
          await getStripe().promotionCodes.update(existing.stripePromotionId, {
            active: data.isActive,
          });
        } catch (stripeError) {
          console.error("Stripe promo toggle error:", stripeError);
        }
      }
    }

    await db.update(promoCodes).set({
      isActive: data.isActive,
      maxRedemptions: data.maxRedemptions,
      validUntil: data.validUntil,
    }).where(eq(promoCodes.id, id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update promo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { id } = await params;

    // Deactivate in Stripe before deleting locally
    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (existing?.stripePromotionId) {
      try {
        await getStripe().promotionCodes.update(existing.stripePromotionId, {
          active: false,
        });
      } catch (stripeError) {
        console.error("Stripe promo deactivate error:", stripeError);
      }
    }

    await db.delete(promoCodes).where(eq(promoCodes.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete promo" }, { status: 500 });
  }
}
