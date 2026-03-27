import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const diagnostics = {
    stripe: {
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "NOT SET",
      publishableKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7) || "NOT SET",
      weeklyPriceId: process.env.STRIPE_VIP_WEEKLY_PRICE_ID || "NOT SET",
      monthlyPriceId: process.env.STRIPE_VIP_MONTHLY_PRICE_ID || "NOT SET",
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 6) || "NOT SET",
      isLiveMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || false,
    },
    clerk: {
      publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 7) || "NOT SET",
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 7) || "NOT SET",
      isLiveMode: process.env.CLERK_SECRET_KEY?.startsWith("sk_live_") || false,
    },
    apis: {
      oddsApiKey: process.env.THE_ODDS_API_KEY ? "SET" : "NOT SET",
      anthropicKey: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ? "SET" : "NOT SET",
      telegramFreeChatId: process.env.TELEGRAM_FREE_CHAT_ID ? "SET" : "NOT SET",
      telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ? "SET" : "NOT SET",
      mailerLiteKey: (process.env.MAILERLITE_API_KEY || process.env.MAILERLIGHT_API_KEY) ? "SET" : "NOT SET",
      cronSecret: process.env.CRON_SECRET ? "SET" : "NOT SET",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "NOT SET",
    },
    database: {
      tursoUrl: process.env.TURSO_DATABASE_URL ? "SET" : "NOT SET",
      tursoToken: process.env.TURSO_AUTH_TOKEN ? "SET" : "NOT SET",
    },
    warnings: [] as string[],
  };

  if (!diagnostics.stripe.isLiveMode) {
    diagnostics.warnings.push("Stripe is in TEST mode");
  }
  if (!diagnostics.clerk.isLiveMode) {
    diagnostics.warnings.push("Clerk is in TEST mode");
  }
  if (diagnostics.apis.siteUrl === "NOT SET" || diagnostics.apis.siteUrl.includes("localhost")) {
    diagnostics.warnings.push("NEXT_PUBLIC_SITE_URL is not set or points to localhost");
  }
  if (diagnostics.stripe.weeklyPriceId.includes("test")) {
    diagnostics.warnings.push("Stripe weekly price ID appears to be a test ID");
  }
  if (diagnostics.stripe.monthlyPriceId.includes("test")) {
    diagnostics.warnings.push("Stripe monthly price ID appears to be a test ID");
  }

  return NextResponse.json(diagnostics);
}
