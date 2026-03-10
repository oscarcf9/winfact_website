import { db } from "@/db";
import { deliveryLogs, deliveryQueue, picks } from "@/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import { DistributionHub } from "@/components/admin/distribution-hub";

export default async function AdminDistributionPage() {
  const [recentLogs, pendingQueue, recentPicks] = await Promise.all([
    db
      .select()
      .from(deliveryLogs)
      .orderBy(desc(deliveryLogs.sentAt))
      .limit(50),
    db
      .select()
      .from(deliveryQueue)
      .where(eq(deliveryQueue.status, "pending"))
      .orderBy(desc(deliveryQueue.createdAt))
      .limit(20),
    db
      .select()
      .from(picks)
      .where(eq(picks.status, "published"))
      .orderBy(desc(picks.publishedAt))
      .limit(20),
  ]);

  const totalSent = await db
    .select({ count: count() })
    .from(deliveryLogs)
    .where(eq(deliveryLogs.status, "sent"))
    .then((r) => r[0]?.count ?? 0);

  const totalFailed = await db
    .select({ count: count() })
    .from(deliveryLogs)
    .where(eq(deliveryLogs.status, "failed"))
    .then((r) => r[0]?.count ?? 0);

  const todayStart = new Date().toISOString().split("T")[0];
  const sentToday = await db
    .select({ count: count() })
    .from(deliveryLogs)
    .where(sql`${deliveryLogs.sentAt} >= ${todayStart}`)
    .then((r) => r[0]?.count ?? 0);

  return (
    <DistributionHub
      recentLogs={recentLogs}
      pendingQueue={pendingQueue}
      recentPicks={recentPicks}
      stats={{
        totalSent,
        totalFailed,
        sentToday,
        pendingCount: pendingQueue.length,
      }}
    />
  );
}
