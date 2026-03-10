import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      // Return defaults if no preferences exist yet
      return NextResponse.json({
        channelEmail: true,
        channelPush: true,
        sportMlb: true,
        sportNfl: true,
        sportNba: true,
        sportNhl: true,
        sportSoccer: true,
        sportNcaa: true,
      });
    }

    return NextResponse.json({
      channelEmail: prefs.channelEmail,
      channelPush: prefs.channelPush,
      sportMlb: prefs.sportMlb,
      sportNfl: prefs.sportNfl,
      sportNba: prefs.sportNba,
      sportNhl: prefs.sportNhl,
      sportSoccer: prefs.sportSoccer,
      sportNcaa: prefs.sportNcaa,
    });
  } catch (error) {
    console.error("Notification preferences GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate only allowed fields
    const allowedFields = [
      "channelEmail",
      "channelPush",
      "sportMlb",
      "sportNfl",
      "sportNba",
      "sportNhl",
      "sportSoccer",
      "sportNcaa",
    ];

    const updates: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        updates[field] = body[field];
      }
    }

    // Check if preferences already exist
    const [existing] = await db
      .select({ id: notificationPreferences.id })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(notificationPreferences)
        .set(updates)
        .where(eq(notificationPreferences.userId, userId));
    } else {
      await db.insert(notificationPreferences).values({
        id: randomUUID(),
        userId,
        ...updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification preferences PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
