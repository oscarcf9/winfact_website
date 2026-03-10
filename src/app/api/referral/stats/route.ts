import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { referrals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const total = userReferrals.length;
    const converted = userReferrals.filter((r) => r.status === "converted").length;
    const rewardsApplied = userReferrals.filter((r) => r.rewardApplied).length;

    return NextResponse.json({
      total,
      converted,
      rewardsApplied,
      referrals: userReferrals.map((r) => ({
        email: r.referredEmail,
        status: r.status,
        rewardApplied: r.rewardApplied,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Referral stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch referral stats" }, { status: 500 });
  }
}
