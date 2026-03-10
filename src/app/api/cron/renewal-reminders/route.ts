import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { PLANS } from "@/lib/stripe";
import { renewalReminderEmail } from "@/lib/emails";
import { sendTransactionalEmail } from "@/lib/mailerlite";

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find subscriptions renewing in ~2 days
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = await db
      .select({
        subId: subscriptions.id,
        userId: subscriptions.userId,
        tier: subscriptions.tier,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.currentPeriodEnd, twoDaysFromNow.toISOString()),
          lte(subscriptions.currentPeriodEnd, threeDaysFromNow.toISOString())
        )
      );

    let sent = 0;

    for (const sub of upcomingRenewals) {
      if (!sub.userId) continue;

      const [user] = await db
        .select({ email: users.email, language: users.language })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);

      if (!user?.email) continue;

      const plan = PLANS[sub.tier as keyof typeof PLANS];
      const planName = plan?.name || sub.tier || "VIP";
      const amount = plan ? `$${plan.price}` : "your plan amount";
      const renewalDate = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "soon";

      const tmpl = renewalReminderEmail(planName, renewalDate, amount);
      const html = user.language === "es" ? tmpl.htmlEs : tmpl.htmlEn;

      try {
        await sendTransactionalEmail(user.email, tmpl.subject, html);
        sent++;
      } catch (emailError) {
        console.error(`Failed to send renewal reminder to ${user.email}:`, emailError);
      }
    }

    return NextResponse.json({
      ok: true,
      found: upcomingRenewals.length,
      sent,
    });
  } catch (error) {
    console.error("Renewal reminders cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
