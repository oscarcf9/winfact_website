import { NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions, promoCodes, users, referrals, webhookLogs, processedEvents, revenueEvents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import Stripe from "stripe";
import {
  welcomeEmail,
  paymentFailedEmail,
  cancellationEmail,
  upgradeConfirmationEmail,
  trialEndingSoonEmail,
} from "@/lib/emails";
import { sendTransactionalEmail, moveSubscriberToVIP, moveSubscriberToFree } from "@/lib/mailerlite";
import { notifyReferralMilestone, sendAdminNotification } from "@/lib/telegram";
import { sanitizeWebhookPayload } from "@/lib/webhook-sanitizer";

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

  // Track revenue event
  const plan = subscription.metadata.plan || "vip_monthly";
  const monthlyAmount = plan === "vip_weekly" ? 45 * 4.33 : 120;
  try {
    await db.insert(revenueEvents).values({
      id: crypto.randomUUID(),
      userId: clerkUserId,
      type: "new_mrr",
      amount: monthlyAmount,
      tier: plan,
      stripeEventId: subscription.id,
      promoCode: subscription.metadata.promoCode || null,
      source: subscription.metadata.referralCode ? "referral" : "organic",
    });
  } catch (revErr) {
    console.error("Failed to track revenue event:", revErr);
  }

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

      const tmpl = welcomeEmail(planName, trialEnd, email);
      const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
      await sendTransactionalEmail(email, tmpl.subject, html);
    }
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
  }

  // Move subscriber to VIP MailerLite segment
  try {
    const { email: subEmail } = await getUserEmail(clerkUserId);
    if (subEmail) {
      moveSubscriberToVIP(subEmail).catch((err) =>
        console.error("MailerLite VIP segment sync failed:", err)
      );
    }
  } catch (segErr) {
    console.error("Failed to sync MailerLite segment:", segErr);
  }

  // Send admin Telegram notification (fire-and-forget)
  try {
    const { email: notifEmail } = await getUserEmail(clerkUserId);
    const plan = subscription.metadata.plan || "vip_monthly";
    const planName = PLANS[plan as keyof typeof PLANS]?.name || "VIP";
    const trialDays = subscription.trial_end ? "7-day trial" : "No trial";
    sendAdminNotification(
      `💰 *NEW VIP SUBSCRIBER*\n\n📧 ${notifEmail}\n📦 Plan: ${planName}\n🕐 ${trialDays}`
    ).catch(() => {});
  } catch {}

  // Convert referral if this user was referred
  try {
    await convertReferralIfReferred(clerkUserId);
  } catch (refError) {
    console.error("Failed to process referral conversion:", refError);
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
        const tmpl = upgradeConfirmationEmail(planName, email);
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

  const clerkUserId =
    subscription.metadata.clerkUserId ||
    (await getClerkUserIdFromCustomer(subscription.customer as string));

  // Track churn revenue event
  const plan = subscription.metadata.plan || "vip_monthly";
  const monthlyAmount = plan === "vip_weekly" ? 45 * 4.33 : 120;
  try {
    await db.insert(revenueEvents).values({
      id: crypto.randomUUID(),
      userId: clerkUserId || null,
      type: "churn",
      amount: -monthlyAmount,
      tier: plan,
      stripeEventId: subscription.id,
      source: "organic",
    });
  } catch (revErr) {
    console.error("Failed to track churn event:", revErr);
  }

  // Send cancellation email with win-back promo
  try {
    if (clerkUserId) {
      const { email, language } = await getUserEmail(clerkUserId);
      if (email) {
        const cancelAt = subscription.cancel_at || subscription.canceled_at;
        const accessEnd = cancelAt
          ? new Date(cancelAt * 1000).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "the end of your current period";

        const tmpl = cancellationEmail(accessEnd, "PICK80", email);
        const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
        await sendTransactionalEmail(email, tmpl.subject, html);

        // Move subscriber back to FREE MailerLite segment
        moveSubscriberToFree(email).catch((err) =>
          console.error("MailerLite FREE segment sync failed:", err)
        );

        // Admin notification
        const plan = subscription.metadata.plan || "VIP";
        sendAdminNotification(
          `⚠️ *SUBSCRIPTION CANCELLED*\n\n📧 ${email}\n📦 Plan: ${plan}\n📅 Access until: ${accessEnd}`
        ).catch(() => {});
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

          const tmpl = paymentFailedEmail(amount, email);
          const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
          await sendTransactionalEmail(email, tmpl.subject, html);

          // Admin notification
          sendAdminNotification(
            `🚨 *PAYMENT FAILED*\n\n📧 ${email}\n💰 Amount: ${amount}`
          ).catch(() => {});
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

const REFERRAL_MILESTONES = [
  { threshold: 1, reward: "credit_10", label: "$10 Credit" },
  { threshold: 5, reward: "free_month", label: "1 Free Month VIP" },
  { threshold: 10, reward: "vip_discount", label: "Permanent VIP Discount" },
];

/**
 * When a referred user subscribes, mark their referral as converted
 * and check if the referrer hit a reward milestone.
 */
async function convertReferralIfReferred(clerkUserId: string) {
  // Get the subscriber's email
  const [user] = await db
    .select({ email: users.email, referredBy: users.referredBy })
    .from(users)
    .where(eq(users.id, clerkUserId))
    .limit(1);

  if (!user?.email) return;

  // Primary: find pending referral by email
  let [pendingRef] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredEmail, user.email),
        eq(referrals.status, "pending")
      )
    )
    .limit(1);

  // Fallback: if no email match (user may have changed email), use referredBy field
  if (!pendingRef && user.referredBy) {
    [pendingRef] = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, user.referredBy),
          eq(referrals.status, "pending")
        )
      )
      .limit(1);

    // Sync referral email to current email for future lookups
    if (pendingRef) {
      await db.update(referrals)
        .set({ referredEmail: user.email })
        .where(eq(referrals.id, pendingRef.id));
    }
  }

  if (!pendingRef) return;

  // Optimistic lock: only convert if still pending (prevents double-conversion race)
  const now = new Date().toISOString();
  const convertResult = await db
    .update(referrals)
    .set({ status: "converted", convertedAt: now })
    .where(
      and(
        eq(referrals.id, pendingRef.id),
        eq(referrals.status, "pending") // optimistic lock
      )
    );

  // If no rows affected, another process already converted this referral
  if (convertResult.rowsAffected === 0) return;

  // Check referrer's total converted count for milestone notification
  if (!pendingRef.referrerId) return;

  const referrerRefs = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, pendingRef.referrerId));

  // +1 because the current one was just converted
  const convertedCount = referrerRefs.filter((r) => r.status === "converted").length + 1;
  const appliedRewards = referrerRefs
    .filter((r) => r.rewardApplied && r.rewardType)
    .map((r) => r.rewardType!);

  // Check if a new milestone was hit
  const newMilestone = REFERRAL_MILESTONES.find(
    (m) => convertedCount >= m.threshold && !appliedRewards.includes(m.reward)
  );

  if (newMilestone) {
    // Get referrer info for notification
    const [referrer] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, pendingRef.referrerId))
      .limit(1);

    if (referrer) {
      notifyReferralMilestone({
        userName: referrer.name || "",
        userEmail: referrer.email,
        referralCount: convertedCount,
        rewardLabel: newMilestone.label,
      }).catch((err) => console.error("Referral milestone notification failed:", err));
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

  // Deduplication: prevent processing the same event twice
  const [existing] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, event.id))
    .limit(1);

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const startTime = Date.now();

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

      case "customer.subscription.trial_will_end": {
        const trialSub = event.data.object as Stripe.Subscription;
        const trialUserId =
          trialSub.metadata.clerkUserId ||
          (await getClerkUserIdFromCustomer(trialSub.customer as string));

        if (trialUserId) {
          try {
            const { email, language } = await getUserEmail(trialUserId);
            if (email) {
              const trialEndDate = trialSub.trial_end
                ? new Date(trialSub.trial_end * 1000).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "soon";

              const tmpl = trialEndingSoonEmail(3, trialEndDate, email);
              const html = language === "es" ? tmpl.htmlEs : tmpl.htmlEn;
              await sendTransactionalEmail(email, tmpl.subject, html);
            }
          } catch (emailError) {
            console.error("Failed to send trial ending email:", emailError);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          `[stripe] Payment succeeded: ${invoice.id}, amount: ${invoice.amount_paid}, customer: ${invoice.customer}`
        );
        // Track payment in revenue events (for renewal payments, not first payment which is tracked via subscription.created)
        if (invoice.billing_reason === "subscription_cycle") {
          const customerId = invoice.customer as string;
          const userId = await getClerkUserIdFromCustomer(customerId);
          if (userId) {
            const amountDollars = (invoice.amount_paid || 0) / 100;
            await db.insert(revenueEvents).values({
              id: crypto.randomUUID(),
              userId,
              type: "new_mrr",
              amount: amountDollars,
              tier: (invoice.lines?.data?.[0] as unknown as { price?: { lookup_key?: string } })?.price?.lookup_key || null,
              stripeEventId: invoice.id,
              source: "organic",
            }).catch((err) => console.error("Failed to track renewal payment:", err));
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const refundAmount = (charge.amount_refunded || 0) / 100;
        console.log(
          `[stripe] Refund processed: charge ${charge.id}, amount refunded: $${refundAmount}`
        );
        // Track refund in revenue events
        const refundCustomerId = charge.customer as string;
        const refundUserId = refundCustomerId ? await getClerkUserIdFromCustomer(refundCustomerId) : null;
        await db.insert(revenueEvents).values({
          id: crypto.randomUUID(),
          userId: refundUserId || null,
          type: "churn",
          amount: -refundAmount,
          stripeEventId: charge.id,
          source: "organic",
        }).catch((err) => console.error("Failed to track refund event:", err));
        break;
      }
    }

    // Mark as processed AFTER successful processing
    await db.insert(processedEvents).values({
      eventId: event.id,
      processedAt: Date.now(),
    }).onConflictDoNothing();

  } catch (error) {
    console.error(`Stripe webhook error for event ${event.id} (${event.type}):`, error);

    // Do NOT insert into processedEvents — let Stripe retry
    await db.insert(webhookLogs).values({
      id: crypto.randomUUID(),
      source: "stripe",
      direction: "incoming",
      endpoint: `/api/webhooks/stripe`,
      method: "POST",
      statusCode: 500,
      payload: sanitizeWebhookPayload(event.data.object),
      duration: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // Log successful webhook (sanitized — no PII stored)
  await db.insert(webhookLogs).values({
    id: crypto.randomUUID(),
    source: "stripe",
    direction: "incoming",
    endpoint: `/api/webhooks/stripe`,
    method: "POST",
    statusCode: 200,
    payload: sanitizeWebhookPayload({ type: event.type, objectId: (event.data.object as { id?: string }).id }),
    duration: Date.now() - startTime,
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
