"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  RefreshCw,
  Zap,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Bot,
} from "lucide-react";

type Game = {
  id: string;
  sport: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  venue: string | null;
  status: string | null;
  modelSpread: number | null;
  modelTotal: number | null;
  modelEdge: number | null;
  sharpAction: string | null;
  publicBetPct: number | null;
  publicMoneyPct: number | null;
  injuryReport: string | null;
  weather: string | null;
  pickStatus: string | null;
  pickId: string | null;
  edgeTier: string | null;
  fetchedAt: string | null;
};

type Pick = {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  status: string | null;
};

type Props = {
  games: Game[];
  publishedPicks: Pick[];
  sports: string[];
};

export function IntelligenceDashboard({ games, publishedPicks: _publishedPicks, sports }: Props) {
  const t = useTranslations("admin.intelligence");

  const [selectedSport, setSelectedSport] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = selectedSport === "All"
    ? games
    : games.filter((g) => g.sport === selectedSport);

  // Group by edge tier for summary
  const strongEdge = games.filter((g) => g.edgeTier === "strong").length;
  const moderateEdge = games.filter((g) => g.edgeTier === "moderate").length;
  const posted = games.filter((g) => g.pickStatus === "posted").length;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/admin/games-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }

  const statCards = [
    { icon: Activity, value: String(games.length), label: t("totalGames"), accent: "from-primary to-primary" },
    { icon: Zap, value: String(strongEdge), label: t("strongEdge"), accent: "from-success to-success" },
    { icon: TrendingUp, value: String(moderateEdge), label: t("moderateEdge"), accent: "from-warning to-warning" },
    { icon: Target, value: String(posted), label: t("picksPosted"), accent: "from-accent to-accent" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("refreshGames")}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:bg-gray-100 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="font-mono text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Sport Filters */}
      <div className="flex flex-wrap gap-2">
        {["All", ...sports].map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSport(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              selectedSport === s
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 text-center">
          <Activity className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm mb-2">{t("noGames")}</p>
          <p className="text-gray-300 text-xs">{t("noGamesHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((game) => {
            const sharp = game.sharpAction ? JSON.parse(game.sharpAction) : null;
            const injuries = game.injuryReport ? JSON.parse(game.injuryReport) : [];
            const _weather = game.weather ? JSON.parse(game.weather) : null;
            const time = new Date(game.commenceTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: "America/New_York",
            });

            return (
              <div
                key={game.id}
                className={`relative rounded-2xl bg-white border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                  game.edgeTier === "strong"
                    ? "border-success/30"
                    : game.edgeTier === "moderate"
                      ? "border-warning/30"
                      : "border-gray-200"
                }`}
              >
                {/* Edge tier bar */}
                <div className={`h-[2px] ${
                  game.edgeTier === "strong"
                    ? "bg-gradient-to-r from-success to-success"
                    : game.edgeTier === "moderate"
                      ? "bg-gradient-to-r from-warning to-warning"
                      : "bg-gray-200"
                }`} />

                <div className="p-5">
                  {/* Sport & Time */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{game.sport}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {time} ET
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="mb-4">
                    <p className="font-semibold text-navy text-base">{game.awayTeam}</p>
                    <p className="text-gray-400 text-xs my-0.5">{t("at")}</p>
                    <p className="font-semibold text-navy text-base">{game.homeTeam}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Edge tier */}
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      game.edgeTier === "strong"
                        ? "bg-success/15 text-success border border-success/20"
                        : game.edgeTier === "moderate"
                          ? "bg-warning/15 text-warning border border-warning/20"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {game.edgeTier === "strong" ? t("strongEdge") : game.edgeTier === "moderate" ? t("moderate") : t("noEdge")}
                    </span>

                    {/* Pick status */}
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      game.pickStatus === "posted"
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : game.pickStatus === "skip"
                          ? "bg-gray-100 text-gray-400 border border-gray-200"
                          : "bg-accent/10 text-accent border border-accent/20"
                    }`}>
                      {game.pickStatus === "posted" ? t("pickPosted") : game.pickStatus === "skip" ? t("skipped") : t("pendingStatus")}
                    </span>

                    {/* Sharp action */}
                    {sharp?.isSharp && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                        {t("sharpAction")}
                      </span>
                    )}
                  </div>

                  {/* Model Data */}
                  {(game.modelEdge || game.modelSpread) && (
                    <div className="flex gap-4 mb-4 text-xs">
                      {game.modelEdge && (
                        <div>
                          <span className="text-gray-400">{t("edge")}</span>{" "}
                          <span className="font-mono font-semibold text-success">{game.modelEdge.toFixed(1)}%</span>
                        </div>
                      )}
                      {game.modelSpread && (
                        <div>
                          <span className="text-gray-400">{t("modelLine")}</span>{" "}
                          <span className="font-mono font-semibold text-navy">{game.modelSpread > 0 ? "+" : ""}{game.modelSpread}</span>
                        </div>
                      )}
                      {game.publicBetPct && (
                        <div>
                          <span className="text-gray-400">{t("public")}</span>{" "}
                          <span className="font-mono text-gray-600">{game.publicBetPct}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Injuries indicator */}
                  {injuries.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-warning mb-3">
                      <AlertTriangle className="h-3 w-3" />
                      {injuries.length} {injuries.length > 1 ? t("injuryUpdates") : t("injuryUpdate")}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {game.pickStatus !== "posted" && (
                      <Link
                        href={`/admin/picks/new?sport=${encodeURIComponent(game.sport)}&matchup=${encodeURIComponent(`${game.awayTeam} vs ${game.homeTeam}`)}`}
                        className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      >
                        <Target className="h-3.5 w-3.5" />
                        {t("quickPick")}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <Link
                      href={`/admin/ai?tab=analysis&sport=${encodeURIComponent(game.sport)}&matchup=${encodeURIComponent(`${game.awayTeam} vs ${game.homeTeam}`)}&modelEdge=${game.modelEdge ?? ""}&odds=${game.modelSpread ?? ""}&sharpAction=${sharp?.isSharp ? "true" : ""}&injuries=${injuries.length > 0 ? `${injuries.length} injuries reported` : ""}`}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all duration-200"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      AI
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
