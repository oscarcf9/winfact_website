"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  RefreshCw,
  Zap,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Search,
  Circle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ESPNGame = {
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
  games: ESPNGame[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";

const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function QuickPickModal({ open, onClose, onSuccess }: Props) {
  const t = useTranslations("admin.quickPick");

  const [step, setStep] = useState(1);
  const [leagueData, setLeagueData] = useState<LeagueGames[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Game selection
  const [selectedGame, setSelectedGame] = useState<ESPNGame | null>(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  // Manual entry
  const [sport, setSport] = useState("");
  const [matchup, setMatchup] = useState("");

  // Pick fields
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pickText, setPickText] = useState("");
  const [odds, setOdds] = useState("");
  const [units, setUnits] = useState("");
  const [confidence, setConfidence] = useState("");
  const [tier, setTier] = useState("vip");
  const [analysis, setAnalysis] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchGames = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingGames(true);

    try {
      const res = await fetch("/api/admin/games-scoreboard");
      if (res.ok) {
        const data = await res.json();
        setLeagueData(data);
      }
    } catch {
      // silent
    } finally {
      setLoadingGames(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchGames();
      setStep(1);
      setSelectedGame(null);
      setSelectedLeague("");
      setSportFilter("All");
      setSearchQuery("");
      setManualOpen(false);
      setSport("");
      setMatchup("");
      setGameDate(new Date().toISOString().split("T")[0]);
      setPickText("");
      setOdds("");
      setUnits("");
      setConfidence("");
      setTier("vip");
      setAnalysis("");
      setError("");
    }
  }, [open, fetchGames]);

  // All leagues with games
  const leagues = useMemo(() => leagueData.map((d) => d.league), [leagueData]);

  // Filtered + searched games
  const filteredGames = useMemo(() => {
    let result = leagueData;

    if (sportFilter !== "All") {
      result = result.filter((d) => d.league === sportFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result
        .map((d) => ({
          ...d,
          games: d.games.filter(
            (g) =>
              g.homeTeam.toLowerCase().includes(q) ||
              g.awayTeam.toLowerCase().includes(q)
          ),
        }))
        .filter((d) => d.games.length > 0);
    }

    return result;
  }, [leagueData, sportFilter, searchQuery]);

  function handleSelectGame(game: ESPNGame, league: string) {
    setSelectedGame(game);
    setSelectedLeague(league);
    setSport(league);
    setMatchup(`${game.awayTeam} vs ${game.homeTeam}`);
    setManualOpen(false);
    setSearchQuery("");
  }

  function clearSelection() {
    setSelectedGame(null);
    setSelectedLeague("");
    setSport("");
    setMatchup("");
  }

  // Effective values (from selected game or manual entry)
  const effectiveSport = selectedGame ? selectedLeague : sport;
  const effectiveMatchup = selectedGame
    ? `${selectedGame.awayTeam} vs ${selectedGame.homeTeam}`
    : matchup;

  function handleNext() {
    if (!effectiveSport || !effectiveMatchup) {
      setError(t("gameRequired"));
      return;
    }
    if (!pickText) {
      setError(t("pickRequired"));
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const payload: Record<string, unknown> = {
      sport: effectiveSport,
      matchup: effectiveMatchup,
      pickText,
      gameDate,
      tier,
      status: "published",
      analysisEn: analysis || null,
    };
    if (odds) payload.odds = Number(odds);
    if (units) payload.units = Number(units);
    if (confidence) payload.confidence = confidence;

    try {
      const res = await fetch("/api/admin/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t("failedToPublish"));
        return;
      }

      // Trigger auto-blog generation in the background (non-blocking)
      fetch("/api/admin/auto-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: effectiveSport,
          league: selectedLeague || effectiveSport,
          matchup: effectiveMatchup,
          pickText,
          gameDate,
          odds: odds ? Number(odds) : null,
          units: units ? Number(units) : null,
          confidence: confidence || null,
          tier,
          analysisEn: analysis || null,
        }),
      }).catch(() => {
        // Blog generation is best-effort, don't block the pick
      });

      onSuccess();
      onClose();
    } catch {
      setError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-heading font-bold text-navy">
              {t("title")}
            </h2>
            <div className="flex items-center gap-1.5 ml-2">
              <div className={cn("h-2 w-2 rounded-full transition-colors", step === 1 ? "bg-primary" : "bg-gray-200")} />
              <div className={cn("h-2 w-2 rounded-full transition-colors", step === 2 ? "bg-primary" : "bg-gray-200")} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Selected game preview */}
              {selectedGame && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{selectedLeague}</span>
                      <p className="text-sm font-semibold text-navy mt-0.5">
                        {selectedGame.awayTeam} vs {selectedGame.homeTeam}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {selectedGame.status === "pre"
                          ? formatTime(selectedGame.startTime)
                          : selectedGame.statusDetail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Game Picker (only when no game selected) */}
              {!selectedGame && !manualOpen && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-500">{t("selectGame")}</label>
                    <button
                      type="button"
                      onClick={() => fetchGames(true)}
                      disabled={refreshing}
                      className="flex items-center gap-1 text-xs text-primary hover:text-accent font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? t("refreshing") : t("refreshGames")}
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder={t("searchTeams")}
                    />
                  </div>

                  {/* Sport filter pills */}
                  {leagues.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
                      <button
                        type="button"
                        onClick={() => setSportFilter("All")}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                          sportFilter === "All"
                            ? "bg-navy text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {t("all") || "All"}
                      </button>
                      {leagues.map((league) => (
                        <button
                          key={league}
                          type="button"
                          onClick={() => setSportFilter(league)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                            sportFilter === league
                              ? "bg-navy text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {league}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Games list */}
                  {loadingGames ? (
                    <div className="flex items-center justify-center py-6">
                      <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                    </div>
                  ) : filteredGames.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {searchQuery ? "No matching games found" : t("noGames")}
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      {filteredGames.map((ld) => (
                        <div key={ld.league}>
                          <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                            {ld.league} — {ld.games.length} {ld.games.length === 1 ? "game" : "games"}
                          </div>
                          {ld.games.map((game) => (
                            <button
                              key={game.id}
                              type="button"
                              onClick={() => handleSelectGame(game, ld.league)}
                              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-primary/[0.04] transition-colors cursor-pointer text-left border-t border-gray-100 first:border-t-0"
                            >
                              {/* Status dot */}
                              {game.status === "in" ? (
                                <Circle className="h-2 w-2 fill-success text-success animate-pulse shrink-0" />
                              ) : game.status === "post" ? (
                                <Circle className="h-2 w-2 fill-gray-300 text-gray-300 shrink-0" />
                              ) : (
                                <Circle className="h-2 w-2 fill-primary/20 text-primary/20 shrink-0" />
                              )}

                              {/* Teams */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-700 truncate">{game.awayTeam}</span>
                                  <span className="text-xs text-gray-300">@</span>
                                  <span className="text-sm text-gray-700 truncate">{game.homeTeam}</span>
                                </div>
                              </div>

                              {/* Score or time */}
                              <div className="shrink-0">
                                {game.status === "pre" ? (
                                  <span className="text-xs text-gray-400 font-mono">
                                    {formatTime(game.startTime)}
                                  </span>
                                ) : game.status === "in" ? (
                                  <span className="text-xs font-semibold text-success">
                                    {game.awayScore}-{game.homeScore}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 font-mono">
                                    {game.awayScore}-{game.homeScore} F
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual entry toggle */}
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="w-full text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer py-1"
                  >
                    {t("manualEntry")} →
                  </button>
                </div>
              )}

              {/* Manual entry (shown when toggled and no game selected) */}
              {!selectedGame && manualOpen && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-500">{t("manualEntry")}</label>
                    <button
                      type="button"
                      onClick={() => setManualOpen(false)}
                      className="text-xs text-primary hover:text-accent font-medium transition-colors cursor-pointer"
                    >
                      ← {t("selectGame")}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelClass}>{t("sport")}</label>
                      <div className="relative">
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className={`${inputClass} appearance-none cursor-pointer pr-8`}
                        >
                          <option value="">--</option>
                          {["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA", "MLS", "Premier League", "La Liga", "Serie A", "Bundesliga", "Champions League", "Liga MX"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>{t("matchup")}</label>
                      <input
                        type="text"
                        value={matchup}
                        onChange={(e) => setMatchup(e.target.value)}
                        className={inputClass}
                        placeholder={t("matchupPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className={labelClass}>{t("date")}</label>
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Pick Text */}
              <div>
                <label className={labelClass}>{t("pickText")}</label>
                <input
                  type="text"
                  value={pickText}
                  onChange={(e) => setPickText(e.target.value)}
                  className={inputClass}
                  placeholder={t("pickTextPlaceholder")}
                />
              </div>

              {/* Tier */}
              <div>
                <label className={labelClass}>{t("tier")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["free", "vip"] as const).map((t_) => (
                    <button
                      key={t_}
                      type="button"
                      onClick={() => setTier(t_)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        tier === t_
                          ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20"
                          : "bg-white border border-gray-200 text-gray-500 hover:border-primary/30 hover:text-navy"
                      }`}
                    >
                      {t(t_)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Optional details */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold text-navy">{effectiveSport}</span>
                  <span>|</span>
                  <span>{effectiveMatchup}</span>
                  <span>|</span>
                  <span>{gameDate}</span>
                </div>
                <p className="text-sm font-medium text-navy">{pickText}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  tier === "vip"
                    ? "bg-accent/15 text-accent"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {tier.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-gray-400">{t("optionalDetails")}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("odds")}</label>
                  <input
                    type="number"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder={t("oddsPlaceholder")}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("units")}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t("confidence")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["standard", "strong", "top"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfidence(confidence === level ? "" : level)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        confidence === level
                          ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20"
                          : "bg-white border border-gray-200 text-gray-500 hover:border-primary/30 hover:text-navy"
                      }`}
                    >
                      {t(level)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>{t("analysisEn")}</label>
                <textarea
                  rows={2}
                  value={analysis}
                  onChange={(e) => setAnalysis(e.target.value)}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder={t("analysisPlaceholder")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 cursor-pointer"
            >
              {t("next")}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-gray-700 transition-all duration-200 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                {submitting ? t("publishing") : t("publishPick")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
