import { db } from "@/db";
import { gamesToday } from "@/db/schema";
import { IntelligenceDashboard } from "@/components/admin/intelligence-dashboard";

export default async function AdminIntelligencePage() {
  const games = await db
    .select()
    .from(gamesToday)
    .orderBy(gamesToday.commenceTime)
    .limit(100);

  const sports = [...new Set(games.map((g) => g.sport))];

  return (
    <IntelligenceDashboard
      games={games}
      sports={sports}
    />
  );
}
