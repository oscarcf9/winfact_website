import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { affiliates, affiliatePayouts } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
    const allPayouts = await db.select().from(affiliatePayouts).orderBy(desc(affiliatePayouts.createdAt)).limit(100);
    return NextResponse.json({ affiliates: allAffiliates, payouts: allPayouts });
  } catch {
    return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const id = crypto.randomUUID();
    const trackingCode = `WF-${data.name.replace(/\s+/g, "").substring(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await db.insert(affiliates).values({
      id,
      userId: data.userId || null,
      name: data.name,
      email: data.email,
      trackingCode,
      commissionRate: data.commissionRate || 10,
      commissionType: data.commissionType || "percentage",
      tier: data.tier || "standard",
      paymentMethod: data.paymentMethod || null,
      paymentEmail: data.paymentEmail || null,
    });

    return NextResponse.json({ id, trackingCode });
  } catch {
    return NextResponse.json({ error: "Failed to create affiliate" }, { status: 500 });
  }
}
