import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, referrals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/user/set-referral
 * Called after signup to link the new user to their referrer.
 * Body: { referralCode: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 referral attempts per minute per IP
    const { success } = await rateLimit(req, { prefix: "referral", maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Check body first, then cookie as server-side backup
    const rawCode = body.referralCode || req.cookies.get("wf_ref")?.value;
    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json({ error: "Missing referralCode" }, { status: 400 });
    }

    const code = rawCode.trim().toUpperCase();

    // Find the referrer by their referral code
    const [referrer] = await db
      .select({ id: users.id, referralCode: users.referralCode })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Don't allow self-referral
    if (referrer.id === user.id) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Check if this user already has a referrer set
    const [currentUserRecord] = await db
      .select({ referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (currentUserRecord?.referredBy) {
      return NextResponse.json({ ok: true, alreadyReferred: true });
    }

    // Check if a referral record already exists for this email
    const email = user.emailAddresses[0]?.emailAddress || "";
    const [existingReferral] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(
        and(
          eq(referrals.referredEmail, email),
          eq(referrals.referrerId, referrer.id)
        )
      )
      .limit(1);

    if (existingReferral) {
      return NextResponse.json({ ok: true, alreadyReferred: true });
    }

    // Update user's referredBy field
    await db
      .update(users)
      .set({ referredBy: referrer.id, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    // Create referral record (pending — will convert when user subscribes)
    await db.insert(referrals).values({
      id: crypto.randomUUID(),
      referrerId: referrer.id,
      referredEmail: email,
      status: "pending",
    });

    // Clear the consumed referral cookie
    const response = NextResponse.json({ ok: true });
    response.cookies.set("wf_ref", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Set referral error:", error);
    return NextResponse.json({ error: "Failed to set referral" }, { status: 500 });
  }
}
