import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, referrals, webhookLogs, processedEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { addSubscriberToFreeGroup } from "@/lib/mailerlite";
import { sendAdminNotification } from "@/lib/telegram";
import { freeWelcomeEmail } from "@/lib/emails";
import { sendTransactionalEmail } from "@/lib/mailerlite";
import { sanitizeWebhookPayload } from "@/lib/webhook-sanitizer";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    public_metadata?: Record<string, unknown>;
    unsafe_metadata?: Record<string, unknown>;
  };
};

import { randomBytes } from "crypto";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const { type, data } = evt;

  // Deduplication: use svix-id as the unique event identifier
  const eventId = `clerk_${svixId}`;
  const [existingEvent] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, eventId))
    .limit(1);

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await db.insert(processedEvents).values({
    eventId,
    processedAt: Date.now(),
  }).onConflictDoNothing();

  const startTime = Date.now();

  try {
    switch (type) {
      case "user.created": {
        const email = data.email_addresses[0]?.email_address;
        const name = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ") || null;
        const role = (data.public_metadata?.role as string) === "admin"
          ? "admin"
          : "member";

        let referralCode: string | undefined;
        let attempts = 0;
        while (attempts < 5) {
          referralCode = generateReferralCode();
          try {
            await db.insert(users).values({
              id: data.id,
              email: email,
              name,
              role: role as "admin" | "member",
              referralCode,
            });
            break;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("UNIQUE") && attempts < 4) {
              attempts++;
              continue;
            }
            throw e;
          }
        }

        // Add to MailerLite FREE group (fire-and-forget)
        if (email) {
          addSubscriberToFreeGroup(email, name).catch((err) =>
            console.error("Failed to add to MailerLite free group:", err)
          );

          // Send free welcome email
          const tmpl = freeWelcomeEmail(name, email);
          sendTransactionalEmail(email, tmpl.subject, tmpl.htmlEn).catch((err) =>
            console.error("Failed to send free welcome email:", err)
          );
        }

        // Notify admin (fire-and-forget)
        sendAdminNotification(
          `📥 *NEW MEMBER*\n\n📧 ${email || "unknown"}\n👤 ${name || "No name"}`
        ).catch(() => {});

        break;
      }

      case "user.updated": {
        const email = data.email_addresses[0]?.email_address;
        const name = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ") || null;
        const role = (data.public_metadata?.role as string) === "admin"
          ? "admin"
          : "member";

        await db
          .update(users)
          .set({
            email,
            name,
            role: role as "admin" | "member",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, data.id));

        // Server-side referral capture fallback:
        // When ReferralCapture sets unsafeMetadata.referralCode, Clerk fires user.updated.
        // If the client-side /api/user/set-referral call failed, we capture it here.
        const refCode = data.unsafe_metadata?.referralCode as string | undefined;
        if (refCode && email) {
          try {
            const [currentUser] = await db.select({ referredBy: users.referredBy })
              .from(users).where(eq(users.id, data.id)).limit(1);

            if (!currentUser?.referredBy) {
              const [referrer] = await db.select({ id: users.id })
                .from(users).where(eq(users.referralCode, refCode)).limit(1);

              if (referrer && referrer.id !== data.id) {
                await db.update(users)
                  .set({ referredBy: referrer.id, updatedAt: new Date().toISOString() })
                  .where(eq(users.id, data.id));

                // Create pending referral record if not already created
                const [existingRef] = await db.select({ id: referrals.id })
                  .from(referrals)
                  .where(and(
                    eq(referrals.referrerId, referrer.id),
                    eq(referrals.referredEmail, email)
                  ))
                  .limit(1);

                if (!existingRef) {
                  await db.insert(referrals).values({
                    id: crypto.randomUUID(),
                    referrerId: referrer.id,
                    referredEmail: email,
                    status: "pending",
                  });
                }

                console.log(`[referral] Server-side fallback: linked ${email} to referrer ${referrer.id}`);
              }
            }
          } catch (refError) {
            console.error("[referral] Server-side fallback failed:", refError);
          }
        }

        break;
      }

      case "user.deleted": {
        await db.delete(users).where(eq(users.id, data.id));
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${type}:`, error);

    // Log failed webhook (sanitized)
    await db.insert(webhookLogs).values({
      id: crypto.randomUUID(),
      source: "clerk",
      direction: "incoming",
      endpoint: `/api/webhooks/clerk`,
      method: "POST",
      statusCode: 500,
      payload: sanitizeWebhookPayload({ type, userId: data.id }),
      duration: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // Log successful webhook (sanitized — only event type and user ID, no PII)
  await db.insert(webhookLogs).values({
    id: crypto.randomUUID(),
    source: "clerk",
    direction: "incoming",
    endpoint: `/api/webhooks/clerk`,
    method: "POST",
    statusCode: 200,
    payload: sanitizeWebhookPayload({ type, userId: data.id }),
    duration: Date.now() - startTime,
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
