import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export async function getActiveSubscription(userId: string) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        or(
          eq(subscriptions.status, "active"),
          eq(subscriptions.status, "trialing")
        )
      )
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);

  return result[0] ?? null;
}

export async function getUserSubscription(userId: string) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(subscriptions.createdAt)
    .limit(1);

  return result[0] ?? null;
}
