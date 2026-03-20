import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTransactionalEmail } from "@/lib/mailerlite";
import { trialEndingSoonEmail } from "@/lib/emails";

/**
 * GET /api/cron/trial-reminders
 * Sends a reminder email to users whose trial ends within 3 days.
 * Runs daily at 2 PM UTC via Vercel cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all trialing subscriptions
    const trialingSubs = await db
      .select({
        subId: subscriptions.id,
        userId: subscriptions.userId,
        tier: subscriptions.tier,
        periodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "trialing"));

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let sent = 0;

    for (const sub of trialingSubs) {
      if (!sub.periodEnd || !sub.userId) continue;

      const trialEnd = new Date(sub.periodEnd);

      // Only send if trial ends within 3 days but hasn't ended yet
      if (trialEnd <= now || trialEnd > threeDaysFromNow) continue;

      // Get user email and language
      const [user] = await db
        .select({ email: users.email, language: users.language, name: users.name })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);

      if (!user?.email) continue;

      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const trialEndFormatted = trialEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const tmpl = trialEndingSoonEmail(daysLeft, trialEndFormatted, user.email);
      const html = user.language === "es" ? tmpl.htmlEs : tmpl.htmlEn;

      try {
        await sendTransactionalEmail(user.email, tmpl.subject, html);
        sent++;
      } catch (err) {
        console.error(`Failed to send trial reminder to ${user.email}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      found: trialingSubs.length,
      sent,
    });
  } catch (error) {
    console.error("Trial reminders cron error:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
