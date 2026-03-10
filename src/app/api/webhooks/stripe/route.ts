import { NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions, promoCodes, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import {
  welcomeEmail,
  paymentFailedEmail,
  cancellationEmail,
  upgradeConfirmationEmail,
} from "@/lib/emails";
import { sendTransactionalEmail } from "@/lib/mailerlite";

async function getUserEmail(clerkUserId: string): Promise<{ email: string; language: string }> {
  const [user] = await db
    .select({ email: users.email, language: users.language })
    .from(users)
    .where(eq(users.id, clerkUserId))
    .limit(1);
  return { email: user?.email || "", language: user?.language || "en" };
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const clerkUserId =
    subscription.metadata.clerkUserId ||
    (await getClerkUserIdFromCustomer(subscription.customer as string));

  if (!clerkUserId) {
    console.error("No clerk user ID found for subscription:", subscription.id);
    return;
  }

  // Upsert subscription record
  await upsertSubscription(subscription, clerkUserId);

  // Send welcome email
  try {
    const { email, language } = await getUserEmail(clerkUserId);
    if (email) {
      const plan = subscription.metadata.plan || "vip_monthly";
      const planName = PLANS[plan as keyof typeof PLANS]?.name || "VIP";
      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;

      const tmpl = welcomeEmail(planName, trialEnd);
      const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
      await sendTransactionalEmail(email, tmpl.subject, html);
    }
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const clerkUserId =
    subscription.metadata.clerkUserId ||
    (await getClerkUserIdFromCustomer(subscription.customer as string));

  if (!clerkUserId) {
    console.error("No clerk user ID found for subscription:", subscription.id);
    return;
  }

  // Check if this is a plan change (upgrade)
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  const newPlan = subscription.metadata.plan || "vip_monthly";

  await upsertSubscription(subscription, clerkUserId);

  // If tier changed, send upgrade email
  if (existing && existing.tier !== newPlan && subscription.status === "active") {
    try {
      const { email, language } = await getUserEmail(clerkUserId);
      if (email) {
        const planName = PLANS[newPlan as keyof typeof PLANS]?.name || "VIP";
        const tmpl = upgradeConfirmationEmail(planName);
        const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
        await sendTransactionalEmail(email, tmpl.subject, html);
      }
    } catch (emailError) {
      console.error("Failed to send upgrade email:", emailError);
    }
  }
}

async function upsertSubscription(subscription: Stripe.Subscription, clerkUserId: string) {
  const plan = subscription.metadata.plan || "vip_monthly";

  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "expired",
    paused: "cancelled",
  };

  const mappedStatus = statusMap[subscription.status] || "active";

  const values = {
    id: subscription.id,
    userId: clerkUserId,
    stripeSubscriptionId: subscription.id,
    tier: plan as "free" | "vip_weekly" | "vip_monthly" | "season_pass",
    status: mappedStatus as
      | "active"
      | "trialing"
      | "past_due"
      | "cancelled"
      | "expired",
    currentPeriodStart: new Date(
      subscription.start_date * 1000
    ).toISOString(),
    currentPeriodEnd: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : new Date(
            subscription.billing_cycle_anchor * 1000
          ).toISOString(),
  };

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({
        tier: values.tier,
        status: values.status,
        currentPeriodStart: values.currentPeriodStart,
        currentPeriodEnd: values.currentPeriodEnd,
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  } else {
    await db.insert(subscriptions).values(values);
  }
}

async function getClerkUserIdFromCustomer(
  customerId: string
): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer.metadata?.clerkUserId as string) || null;
  } catch {
    return null;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Send cancellation email with win-back promo
  try {
    const clerkUserId =
      subscription.metadata.clerkUserId ||
      (await getClerkUserIdFromCustomer(subscription.customer as string));

    if (clerkUserId) {
      const { email, language } = await getUserEmail(clerkUserId);
      if (email) {
        // Get the cancellation date from subscription metadata
        const cancelAt = subscription.cancel_at || subscription.canceled_at;
        const accessEnd = cancelAt
          ? new Date(cancelAt * 1000).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "the end of your current period";

        const tmpl = cancellationEmail(accessEnd, "PICK80");
        const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
        await sendTransactionalEmail(email, tmpl.subject, html);
      }
    }
  } catch (emailError) {
    console.error("Failed to send cancellation email:", emailError);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return;

  const subscriptionId =
    typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription.id;

  await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  // Send payment failed email
  try {
    const customerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

    if (customerId) {
      const clerkUserId = await getClerkUserIdFromCustomer(customerId);
      if (clerkUserId) {
        const { email, language } = await getUserEmail(clerkUserId);
        if (email) {
          const amount = invoice.amount_due
            ? `$${(invoice.amount_due / 100).toFixed(2)}`
            : "your subscription";

          const tmpl = paymentFailedEmail(amount);
          const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
          await sendTransactionalEmail(email, tmpl.subject, html);
        }
      }
    }
  } catch (emailError) {
    console.error("Failed to send payment failed email:", emailError);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Increment promo code redemptions if a promo was used
  const promoCode = session.metadata?.promoCode;
  if (promoCode) {
    try {
      await db
        .update(promoCodes)
        .set({
          currentRedemptions: sql`COALESCE(${promoCodes.currentRedemptions}, 0) + 1`,
        })
        .where(eq(promoCodes.code, promoCode));
    } catch (error) {
      console.error("Failed to increment promo redemptions:", error);
    }
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook error for ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
