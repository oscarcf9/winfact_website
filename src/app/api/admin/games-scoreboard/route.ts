import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";

const LEAGUES = ["NBA", "MLB", "NFL", "NHL", "MLS", "Premier League", "La Liga", "Serie A", "Bundesliga", "Champions League", "Liga MX", "NCAAF", "NCAAB"];

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const today = toESPNDate(new Date());

  // Fetch all leagues in parallel
  const results = await Promise.all(
    LEAGUES.map(async (league) => {
      const games = await fetchScoreboard(league, today);
      return { league, games };
    })
  );

  // Only return leagues that have games today
  const withGames = results.filter((r) => r.games.length > 0);

  return NextResponse.json(withGames);
}
