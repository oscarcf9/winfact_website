import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    public_metadata?: Record<string, unknown>;
  };
};

function generateReferralCode(name: string | null): string {
  const prefix = (name || "user").slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${random}`;
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

        await db.insert(users).values({
          id: data.id,
          email: email,
          name,
          role: role as "admin" | "member",
          referralCode: generateReferralCode(name),
        });
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
        break;
      }

      case "user.deleted": {
        await db.delete(users).where(eq(users.id, data.id));
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
