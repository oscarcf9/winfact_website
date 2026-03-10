import { db } from "@/db";
import { affiliates, affiliatePayouts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AffiliateManager } from "@/components/admin/affiliate-manager";

export default async function AdminAffiliatesPage() {
  const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
  const allPayouts = await db.select().from(affiliatePayouts).orderBy(desc(affiliatePayouts.createdAt)).limit(50);

  return <AffiliateManager affiliates={allAffiliates} payouts={allPayouts} />;
}
