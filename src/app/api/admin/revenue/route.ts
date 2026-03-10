import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { revenueEvents, subscriptions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const allEvents = await db
      .select()
      .from(revenueEvents)
      .orderBy(desc(revenueEvents.createdAt))
      .limit(500);

    const allSubs = await db.select().from(subscriptions);

    // Calculate MRR
    const activeSubs = allSubs.filter((s) => s.status === "active" || s.status === "trialing");
    const mrr = activeSubs.reduce((sum, s) => {
      if (s.tier === "vip_weekly") return sum + (45 * 4.33); // ~monthly
      if (s.tier === "vip_monthly") return sum + 120;
      return sum;
    }, 0);

    // Monthly breakdown
    const monthlyRevenue = new Map<string, number>();
    for (const event of allEvents) {
      if (event.type === "churn" || event.type === "contraction") continue;
      const month = event.createdAt?.substring(0, 7) || "unknown";
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + event.amount);
    }

    // By tier
    const byTier = {
      vip_weekly: activeSubs.filter((s) => s.tier === "vip_weekly").length,
      vip_monthly: activeSubs.filter((s) => s.tier === "vip_monthly").length,
      season_pass: activeSubs.filter((s) => s.tier === "season_pass").length,
    };

    // Churn
    const churned = allSubs.filter((s) => s.status === "cancelled" || s.status === "expired").length;
    const churnRate = allSubs.length > 0 ? (churned / allSubs.length) * 100 : 0;

    return NextResponse.json({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      totalSubscribers: activeSubs.length,
      byTier,
      churnRate: Math.round(churnRate * 10) / 10,
      monthlyRevenue: Object.fromEntries(monthlyRevenue),
      recentEvents: allEvents.slice(0, 50),
    });
  } catch (error) {
    console.error("Revenue fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
