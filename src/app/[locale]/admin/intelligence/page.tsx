import { db } from "@/db";
import { gamesToday, picks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { IntelligenceDashboard } from "@/components/admin/intelligence-dashboard";

export default async function AdminIntelligencePage() {
  const games = await db
    .select()
    .from(gamesToday)
    .orderBy(gamesToday.commenceTime)
    .limit(100);

  const publishedPicks = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "published"))
    .orderBy(desc(picks.createdAt))
    .limit(50);

  const sports = [...new Set(games.map((g) => g.sport))];

  return (
    <IntelligenceDashboard
      games={games}
      publishedPicks={publishedPicks}
      sports={sports}
    />
  );
}
