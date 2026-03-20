import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, platform } = body;

    // Validate token
    if (!token || !token.startsWith("ExponentPushToken[")) {
      return NextResponse.json(
        { error: "Invalid push token format" },
        { status: 400 }
      );
    }

    // Validate platform
    if (platform && platform !== "ios" && platform !== "android") {
      return NextResponse.json(
        { error: "Invalid platform. Must be 'ios' or 'android'" },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if userId+token combo exists
    const existing = await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
      .limit(1);

    if (existing.length > 0) {
      // Reactivate and update
      await db
        .update(pushTokens)
        .set({ active: 1, updatedAt: now, platform: platform || existing[0].platform })
        .where(eq(pushTokens.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(pushTokens).values({
        id: crypto.randomUUID(),
        userId,
        token,
        platform: platform || null,
        active: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push token POST error:", error);
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await db
      .update(pushTokens)
      .set({ active: 0, updatedAt: Math.floor(Date.now() / 1000) })
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push token DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate push token" },
      { status: 500 }
    );
  }
}
