"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, Circle, ExternalLink } from "lucide-react";

type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "pre" | "in" | "post";
  statusDetail: string;
  startTime: string;
};

type LeagueGames = {
  league: string;
  games: Game[];
};

const LEAGUE_COLORS: Record<string, string> = {
  NBA: "bg-orange-500",
  MLB: "bg-red-500",
  NFL: "bg-green-600",
  NHL: "bg-blue-600",
  MLS: "bg-purple-500",
  "Premier League": "bg-indigo-600",
  "La Liga": "bg-yellow-500",
  "Serie A": "bg-sky-500",
  Bundesliga: "bg-red-600",
  "Champions League": "bg-blue-800",
  "Liga MX": "bg-emerald-600",
  NCAAF: "bg-amber-700",
  NCAAB: "bg-orange-700",
};

function formatGameTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function googleSearchUrl(awayTeam: string, homeTeam: string): string {
  const query = encodeURIComponent(`${awayTeam} vs ${homeTeam}`);
  return `https://www.google.com/search?q=${query}`;
}

function StatusDot({ status }: { status: "pre" | "in" | "post" }) {
  if (status === "in") {
    return <Circle className="h-2 w-2 fill-success text-success animate-pulse" />;
  }
  if (status === "post") {
    return <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />;
  }
  return <Circle className="h-2 w-2 fill-primary/30 text-primary/30" />;
}

export function TodaysGames() {
  const t = useTranslations("admin.dashboard");
  const [data, setData] = useState<LeagueGames[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");

  async function fetchGames(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/games-scoreboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchGames();
    const interval = setInterval(() => fetchGames(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const leagues = data.map((d) => d.league);
  const totalGames = data.reduce((sum, d) => sum + d.games.length, 0);
  const liveGames = data.reduce(
    (sum, d) => sum + d.games.filter((g) => g.status === "in").length,
    0
  );

  const filtered =
    filter === "All"
      ? data
      : filter === "live"
        ? data
            .map((d) => ({
              ...d,
              games: d.games.filter((g) => g.status === "in"),
            }))
            .filter((d) => d.games.length > 0)
        : data.filter((d) => d.league === filter);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-heading font-bold text-base text-navy">
            {t("todaysGames")}
          </h2>
          <span className="text-xs text-gray-400 font-mono">
            {totalGames} {t("games")}
          </span>
          {liveGames > 0 && (
            <button
              type="button"
              onClick={() => setFilter(filter === "live" ? "All" : "live")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                filter === "live"
                  ? "bg-success text-white"
                  : "bg-success/10 text-success hover:bg-success/20"
              }`}
            >
              <Circle className="h-1.5 w-1.5 fill-current animate-pulse" />
              {liveGames} {t("live")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => fetchGames(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* League filter pills */}
      {leagues.length > 1 && (
        <div className="px-5 py-3 border-b border-gray-50 flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              filter === "All"
                ? "bg-navy text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t("all")} ({totalGames})
          </button>
          {leagues.map((league) => {
            const count = data.find((d) => d.league === league)?.games.length || 0;
            return (
              <button
                key={league}
                type="button"
                onClick={() => setFilter(league)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  filter === league
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {league} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Games list */}
      {data.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-gray-400 text-sm">{t("noGamesScheduled")}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {filtered.map((leagueData) => (
            <div key={leagueData.league}>
              {/* League header */}
              <div className="px-5 py-2 bg-gray-50/70 flex items-center gap-2 sticky top-0 z-10">
                <span
                  className={`h-2 w-2 rounded-full ${LEAGUE_COLORS[leagueData.league] || "bg-gray-400"}`}
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {leagueData.league}
                </span>
                <span className="text-xs text-gray-400">
                  {leagueData.games.length} {t("games")}
                </span>
              </div>

              {/* Games — each row is a clickable link to Google */}
              {leagueData.games.map((game) => (
                <a
                  key={game.id}
                  href={googleSearchUrl(game.awayTeam, game.homeTeam)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-5 py-3 flex items-center gap-3 hover:bg-primary/[0.03] transition-colors group cursor-pointer ${
                    game.status === "in" ? "bg-success/[0.02]" : ""
                  }`}
                >
                  {/* Status */}
                  <StatusDot status={game.status} />

                  {/* Teams & Score */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          game.status === "post" && game.awayScore > game.homeScore
                            ? "font-bold text-navy"
                            : "text-gray-700"
                        }`}
                      >
                        {game.awayTeam}
                      </span>
                      {game.status !== "pre" && (
                        <span
                          className={`text-sm font-mono tabular-nums ${
                            game.status === "post" && game.awayScore > game.homeScore
                              ? "font-bold text-navy"
                              : "text-gray-500"
                          }`}
                        >
                          {game.awayScore}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          game.status === "post" && game.homeScore > game.awayScore
                            ? "font-bold text-navy"
                            : "text-gray-700"
                        }`}
                      >
                        {game.homeTeam}
                      </span>
                      {game.status !== "pre" && (
                        <span
                          className={`text-sm font-mono tabular-nums ${
                            game.status === "post" && game.homeScore > game.awayScore
                              ? "font-bold text-navy"
                              : "text-gray-500"
                          }`}
                        >
                          {game.homeScore}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time / Status + External link icon */}
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-right min-w-[60px]">
                      {game.status === "pre" ? (
                        <span className="text-xs text-gray-400">
                          {formatGameTime(game.startTime)}
                        </span>
                      ) : game.status === "in" ? (
                        <span className="text-xs font-semibold text-success">
                          {game.statusDetail}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">
                          {t("final")}
                        </span>
                      )}
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
