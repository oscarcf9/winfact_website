import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verify the current user is authenticated AND has the "admin" role in the database.
 * Returns the userId on success, or a NextResponse error that the caller should return.
 */
export async function requireAdmin(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { userId };
}
