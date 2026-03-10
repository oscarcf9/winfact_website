import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PromoManager } from "@/components/admin/promo-manager";

export default async function AdminPromosPage() {
  const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));

  return <PromoManager codes={codes} />;
}
