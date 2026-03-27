import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchScoreboard, toESPNDate } from "@/lib/espn";
import { rateLimit } from "@/lib/rate-limit";

const LEAGUES = [
  "NBA", "MLB", "NFL", "NHL", "MLS",
  "Premier League", "La Liga", "Serie A",
  "Bundesliga", "Champions League", "Liga MX",
  "NCAAF", "NCAAB",
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await rateLimit(req, { prefix: "scoreboard", maxRequests: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const today = toESPNDate();

  const results = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const games = await fetchScoreboard(league, today);
        return { league, games };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.games.length > 0);

  const failedLeagues = results
    .map((r, i) => (r.status === "rejected" ? LEAGUES[i] : null))
    .filter(Boolean);

  if (successful.length === 0 && failedLeagues.length > 0) {
    return NextResponse.json({ error: "All league fetches failed", failedLeagues }, { status: 500 });
  }

  return NextResponse.json({ leagues: successful, ...(failedLeagues.length > 0 && { failedLeagues }) });
}
