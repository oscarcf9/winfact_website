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
  Send,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Plus,
  Trash2,
  List,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/star-rating";
import { calculateParlayOdds, formatAmerican } from "@/lib/parlay-odds";

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

type PickMode = "single" | "parlay" | "multi";

type LegDraft = {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  gameDate: string;
};

type QueuedPick = {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  stars: number;
  tier: "free" | "vip";
  gameDate: string;
  analysis: string;
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

const SPORT_OPTIONS = [
  "MLB",
  "NFL",
  "NBA",
  "NHL",
  "Soccer",
  "NCAA",
  "MLS",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Champions League",
  "Liga MX",
];

export function QuickPickModal({ open, onClose, onSuccess }: Props) {
  const t = useTranslations("admin.quickPick");
  const tc = useTranslations("admin.common");
  const tm = useTranslations("admin.picksManager");

  // Mode
  const [mode, setMode] = useState<PickMode>("single");

  // Wizard step: 1 = compose, 2 = confirm/details (single & parlay), multi uses queue only
  const [step, setStep] = useState(1);
  const [leagueData, setLeagueData] = useState<LeagueGames[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Game selection (current composition slot)
  const [selectedGame, setSelectedGame] = useState<ESPNGame | null>(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  // Manual entry
  const [sport, setSport] = useState("");
  const [matchup, setMatchup] = useState("");

  // Current pick/leg fields
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pickText, setPickText] = useState("");
  const [odds, setOdds] = useState("");

  // Parlay / multi collections
  const [parlayLegs, setParlayLegs] = useState<LegDraft[]>([]);
  const [queuedPicks, setQueuedPicks] = useState<QueuedPick[]>([]);

  // Shared fields (apply to whole parlay, or per-pick for single/multi)
  const [units, setUnits] = useState("");
  const [stars, setStars] = useState(0);
  const [tier, setTier] = useState<"free" | "vip">("vip");
  const [analysis, setAnalysis] = useState("");

  const [sendOnPublish, setSendOnPublish] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    distributed: boolean;
    distributionError: string | null;
    batchSummary?: { total: number; succeeded: number; failed: number };
  } | null>(null);

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

  const resetAll = useCallback(() => {
    setMode("single");
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
    setStars(0);
    setTier("vip");
    setAnalysis("");
    setParlayLegs([]);
    setQueuedPicks([]);
    setSendOnPublish(true);
    setError("");
    setPublishResult(null);
  }, []);

  useEffect(() => {
    if (open) {
      fetchGames();
      resetAll();
    }
  }, [open, fetchGames, resetAll]);

  function resetComposition() {
    setSelectedGame(null);
    setSelectedLeague("");
    setSport("");
    setMatchup("");
    setPickText("");
    setOdds("");
    setManualOpen(false);
    setSearchQuery("");
  }

  // Filtered games
  const leagues = useMemo(() => leagueData.map((d) => d.league), [leagueData]);
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
            (g) => g.homeTeam.toLowerCase().includes(q) || g.awayTeam.toLowerCase().includes(q)
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

  // Combined parlay odds preview
  const parlayCombinedOdds = useMemo(
    () => calculateParlayOdds(parlayLegs.map((l) => l.odds)),
    [parlayLegs]
  );

  function validateComposition(): string | null {
    if (!effectiveSport || !effectiveMatchup) return t("gameRequired") || "Game required";
    if (!pickText.trim()) return t("pickRequired") || "Pick text required";
    return null;
  }

  function handleAddLeg() {
    const err = validateComposition();
    if (err) {
      setError(err);
      return;
    }
    if (parlayLegs.length >= 10) {
      setError("Max 10 legs");
      return;
    }
    setParlayLegs((prev) => [
      ...prev,
      {
        sport: effectiveSport,
        matchup: effectiveMatchup,
        pickText: pickText.trim(),
        odds: odds ? Number(odds) : null,
        gameDate,
      },
    ]);
    resetComposition();
    setError("");
  }

  function handleRemoveLeg(idx: number) {
    setParlayLegs((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleQueuePick() {
    const err = validateComposition();
    if (err) {
      setError(err);
      return;
    }
    if (queuedPicks.length >= 10) {
      setError("Max 10 picks per batch");
      return;
    }
    setQueuedPicks((prev) => [
      ...prev,
      {
        sport: effectiveSport,
        matchup: effectiveMatchup,
        pickText: pickText.trim(),
        odds: odds ? Number(odds) : null,
        units: units ? Number(units) : null,
        stars,
        tier,
        gameDate,
        analysis,
      },
    ]);
    resetComposition();
    setOdds("");
    setAnalysis("");
    setError("");
  }

  function handleRemoveQueued(idx: number) {
    setQueuedPicks((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleNext() {
    setError("");
    if (mode === "single") {
      const err = validateComposition();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
      return;
    }
    if (mode === "parlay") {
      if (parlayLegs.length < 2) {
        setError("A parlay needs at least 2 legs");
        return;
      }
      setStep(2);
      return;
    }
    // multi — no step 2, submit the queue directly
    if (queuedPicks.length === 0) {
      setError("Add at least 1 pick to the queue");
      return;
    }
    submitMulti();
  }

  async function submitSingle() {
    setSubmitting(true);
    setError("");
    setPublishResult(null);

    const payload: Record<string, unknown> = {
      pickType: "single",
      sport: effectiveSport,
      matchup: effectiveMatchup,
      pickText,
      gameDate,
      tier,
      status: "published",
      analysisEn: analysis || null,
    };
    if (sendOnPublish) payload.distribute = true;
    if (odds) payload.odds = Number(odds);
    if (units) payload.units = Number(units);
    if (stars > 0) payload.stars = stars;

    try {
      const res = await fetch("/api/admin/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t("failedToPublish") || "Failed to publish");
        return;
      }
      const result = await res.json();
      finishWithResult({
        distributed: result.distributed ?? false,
        distributionError: result.distributionError ?? null,
      });
    } catch {
      setError(t("networkError") || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitParlay() {
    setSubmitting(true);
    setError("");
    setPublishResult(null);

    const payload: Record<string, unknown> = {
      pickType: "parlay",
      sport: parlayLegs[0]?.sport || "Multi",
      matchup: `${parlayLegs.length}-Leg Parlay`,
      pickText: parlayLegs.map((l) => l.pickText).join(" + "),
      gameDate,
      tier,
      status: "published",
      analysisEn: analysis || null,
      legs: parlayLegs.map((l) => ({
        sport: l.sport,
        matchup: l.matchup,
        pickText: l.pickText,
        odds: l.odds,
        gameDate: l.gameDate,
      })),
    };
    if (sendOnPublish) payload.distribute = true;
    if (parlayCombinedOdds != null) payload.odds = parlayCombinedOdds;
    if (units) payload.units = Number(units);
    if (stars > 0) payload.stars = stars;

    try {
      const res = await fetch("/api/admin/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t("failedToPublish") || "Failed to publish parlay");
        return;
      }
      const result = await res.json();
      finishWithResult({
        distributed: result.distributed ?? false,
        distributionError: result.distributionError ?? null,
      });
    } catch {
      setError(t("networkError") || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMulti() {
    setSubmitting(true);
    setError("");
    setPublishResult(null);

    const payload = {
      distribute: sendOnPublish,
      picks: queuedPicks.map((p) => ({
        pickType: "single" as const,
        sport: p.sport,
        matchup: p.matchup,
        pickText: p.pickText,
        gameDate: p.gameDate,
        tier: p.tier,
        status: "published" as const,
        odds: p.odds ?? undefined,
        units: p.units ?? undefined,
        stars: p.stars > 0 ? p.stars : undefined,
        analysisEn: p.analysis || undefined,
        distribute: sendOnPublish,
      })),
    };

    try {
      const res = await fetch("/api/admin/picks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to publish batch");
        return;
      }
      const { results } = (await res.json()) as {
        results: Array<{ ok: boolean; distributed?: boolean }>;
      };
      const succeeded = results.filter((r) => r.ok).length;
      const distributed = results.filter((r) => r.distributed).length;
      finishWithResult({
        distributed: distributed > 0,
        distributionError: null,
        batchSummary: {
          total: results.length,
          succeeded,
          failed: results.length - succeeded,
        },
      });
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function finishWithResult(r: {
    distributed: boolean;
    distributionError: string | null;
    batchSummary?: { total: number; succeeded: number; failed: number };
  }) {
    if (sendOnPublish || r.batchSummary) {
      setPublishResult({
        success: true,
        distributed: r.distributed,
        distributionError: r.distributionError,
        batchSummary: r.batchSummary,
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2800);
    } else {
      onSuccess();
      onClose();
    }
  }

  function handleSubmit() {
    if (mode === "single") submitSingle();
    else if (mode === "parlay") submitParlay();
    else submitMulti();
  }

  if (!open) return null;

  // ─── Render helpers ────────────────────────────────────────

  const renderGamePicker = (compact = false) => {
    if (selectedGame) {
      return (
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
      );
    }

    if (manualOpen) {
      return (
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
                  {SPORT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
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
      );
    }

    return (
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

        {leagues.length > 1 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              type="button"
              onClick={() => setSportFilter("All")}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                sportFilter === "All" ? "bg-navy text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                  sportFilter === league ? "bg-navy text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {league}
              </button>
            ))}
          </div>
        )}

        {loadingGames ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          </div>
        ) : filteredGames.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {searchQuery ? tm("noMatchingGames") : t("noGames")}
          </p>
        ) : (
          <div
            className={cn(
              "border border-gray-200 rounded-xl overflow-hidden overflow-y-auto",
              compact ? "max-h-[160px]" : "max-h-[220px]"
            )}
          >
            {filteredGames.map((ld) => (
              <div key={ld.league}>
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                  {ld.league} — {ld.games.length} {ld.games.length === 1 ? tc("game") : tc("games")}
                </div>
                {ld.games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelectGame(game, ld.league)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-primary/[0.04] transition-colors cursor-pointer text-left border-t border-gray-100 first:border-t-0"
                  >
                    {game.status === "in" ? (
                      <Circle className="h-2 w-2 fill-success text-success animate-pulse shrink-0" />
                    ) : game.status === "post" ? (
                      <Circle className="h-2 w-2 fill-gray-300 text-gray-300 shrink-0" />
                    ) : (
                      <Circle className="h-2 w-2 fill-primary/20 text-primary/20 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-700 truncate">{game.awayTeam}</span>
                        <span className="text-xs text-gray-300">@</span>
                        <span className="text-sm text-gray-700 truncate">{game.homeTeam}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {game.status === "pre" ? (
                        <span className="text-xs text-gray-400 font-mono">{formatTime(game.startTime)}</span>
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

        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="w-full text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer py-1"
        >
          {t("manualEntry")} →
        </button>
      </div>
    );
  };

  const canAdvance =
    (mode === "single" && !!effectiveSport && !!effectiveMatchup && !!pickText) ||
    (mode === "parlay" && parlayLegs.length >= 2) ||
    (mode === "multi" && queuedPicks.length >= 1);

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
            <h2 className="text-lg font-heading font-bold text-navy">{t("title")}</h2>
            {mode === "single" && (
              <div className="flex items-center gap-1.5 ml-2">
                <div className={cn("h-2 w-2 rounded-full transition-colors", step === 1 ? "bg-primary" : "bg-gray-200")} />
                <div className={cn("h-2 w-2 rounded-full transition-colors", step === 2 ? "bg-primary" : "bg-gray-200")} />
              </div>
            )}
            {mode === "parlay" && parlayLegs.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {parlayLegs.length} leg{parlayLegs.length > 1 ? "s" : ""}
              </span>
            )}
            {mode === "multi" && queuedPicks.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {queuedPicks.length} queued
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs — shown on step 1 only, not on result screen */}
        {step === 1 && !publishResult && (
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            {([
              { id: "single", label: "Single", icon: Target },
              { id: "parlay", label: "Parlay", icon: Layers },
              { id: "multi", label: "Multi", icon: List },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    resetComposition();
                    setError("");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-b-2",
                    active
                      ? "text-primary border-primary bg-white"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && !publishResult && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Parlay legs list (always visible in parlay mode) */}
          {mode === "parlay" && step === 1 && parlayLegs.length > 0 && !publishResult && (
            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parlay Legs</h3>
                {parlayCombinedOdds != null && (
                  <span className="text-xs font-mono font-bold text-primary">
                    Combined: {formatAmerican(parlayCombinedOdds)}
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {parlayLegs.map((leg, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">{leg.sport}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-navy truncate">{leg.pickText}</span>
                        {leg.odds != null && (
                          <span className="text-xs font-mono text-gray-500">{formatAmerican(leg.odds)}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{leg.matchup}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLeg(idx)}
                      className="p-1 text-gray-300 hover:text-danger hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Multi queue (always visible in multi mode) */}
          {mode === "multi" && step === 1 && queuedPicks.length > 0 && !publishResult && (
            <div className="mb-5 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Queued Picks ({queuedPicks.length})
              </h3>
              <ul className="space-y-1.5">
                {queuedPicks.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{p.sport}</span>
                        <span
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            p.tier === "vip" ? "bg-accent/15 text-accent" : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {p.tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-mono font-semibold text-navy truncate">{p.pickText}</span>
                        {p.odds != null && (
                          <span className="text-xs font-mono text-gray-500">{formatAmerican(p.odds)}</span>
                        )}
                        {p.units != null && <span className="text-xs text-gray-500">{p.units}u</span>}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{p.matchup}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueued(idx)}
                      className="p-1 text-gray-300 hover:text-danger hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1 composition (all modes) */}
          {step === 1 && !publishResult && (
            <div className="space-y-4">
              {mode === "parlay" && (
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {parlayLegs.length === 0 ? "Add your first leg" : `Add leg ${parlayLegs.length + 1}`}
                </div>
              )}
              {mode === "multi" && (
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {queuedPicks.length === 0 ? "Add your first pick" : `Add pick ${queuedPicks.length + 1}`}
                </div>
              )}

              {renderGamePicker(mode !== "single")}

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

              {/* Parlay/Multi need odds on each leg/pick */}
              {mode !== "single" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("odds")}</label>
                    <input
                      type="number"
                      value={odds}
                      onChange={(e) => setOdds(e.target.value)}
                      className={`${inputClass} font-mono`}
                      placeholder={t("oddsPlaceholder") || "-110"}
                    />
                  </div>
                  {mode === "multi" && (
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
                  )}
                </div>
              )}

              {/* Multi-mode per-pick tier */}
              {mode === "multi" && (
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
              )}

              {/* Single-mode tier (same place as before) */}
              {mode === "single" && (
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
              )}

              {/* Add-to-collection actions for parlay/multi */}
              {mode === "parlay" && (
                <button
                  type="button"
                  onClick={handleAddLeg}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add leg to parlay
                </button>
              )}
              {mode === "multi" && (
                <button
                  type="button"
                  onClick={handleQueuePick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add to queue
                </button>
              )}
            </div>
          )}

          {/* STEP 2: details — single + parlay */}
          {step === 2 && !publishResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                {mode === "single" ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-semibold text-navy">{effectiveSport}</span>
                      <span>|</span>
                      <span>{effectiveMatchup}</span>
                      <span>|</span>
                      <span>{gameDate}</span>
                    </div>
                    <p className="text-sm font-medium text-navy">{pickText}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span className="font-semibold text-navy">{parlayLegs.length}-Leg Parlay</span>
                      {parlayCombinedOdds != null && (
                        <>
                          <span>|</span>
                          <span className="font-mono font-bold text-primary">{formatAmerican(parlayCombinedOdds)}</span>
                        </>
                      )}
                    </div>
                    <ol className="list-decimal pl-5 space-y-0.5 text-sm text-navy">
                      {parlayLegs.map((l, i) => (
                        <li key={i}>
                          <span className="font-mono font-semibold">{l.pickText}</span>
                          {l.odds != null && (
                            <span className="font-mono text-xs text-gray-500 ml-2">{formatAmerican(l.odds)}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    tier === "vip" ? "bg-accent/15 text-accent" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tier.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-gray-400">{t("optionalDetails")}</p>

              {/* Odds + Units (single uses odds here; parlay odds are combined from legs so read-only) */}
              <div className="grid grid-cols-2 gap-3">
                {mode === "single" ? (
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
                ) : (
                  <div>
                    <label className={labelClass}>Combined odds</label>
                    <div className={`${inputClass} font-mono bg-gray-50 text-gray-500`}>
                      {parlayCombinedOdds != null ? formatAmerican(parlayCombinedOdds) : "—"}
                    </div>
                  </div>
                )}
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

              {/* Stars */}
              <div>
                <label className={labelClass}>{t("confidence")}</label>
                <StarRating value={stars} onChange={setStars} size="md" />
              </div>

              {/* Analysis */}
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

              {/* Distribution toggle */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Send className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium text-navy">{tm("distributeOnPublish")}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sendOnPublish}
                    onClick={() => setSendOnPublish(!sendOnPublish)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${sendOnPublish ? "bg-primary" : "bg-gray-200"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${sendOnPublish ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </label>
                {sendOnPublish && (
                  <div className="flex items-start gap-1.5 pt-1 border-t border-gray-200">
                    <Radio className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-500">
                      {tier === "free" ? tm("distributionFreePick") : tm("distributionVipPick")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Publish result */}
          {publishResult && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {publishResult.batchSummary ? (
                <>
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-navy">
                      {publishResult.batchSummary.succeeded} of {publishResult.batchSummary.total} picks sent
                    </p>
                    {publishResult.batchSummary.failed > 0 && (
                      <p className="text-sm text-warning mt-1">
                        {publishResult.batchSummary.failed} failed — check audit log
                      </p>
                    )}
                  </div>
                </>
              ) : publishResult.distributed ? (
                <>
                  <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-navy">{tm("pickPublishedDistributed")}</p>
                    <p className="text-sm text-gray-400 mt-1">{tm("telegramEmailSent")}</p>
                  </div>
                </>
              ) : publishResult.success && !sendOnPublish ? (
                <>
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-navy">{tm("pickPublished")}</p>
                    <p className="text-sm text-gray-400 mt-1">{tm("savedWithoutDistribution")}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-warning" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-navy">{tm("pickSavedDistributionIssue")}</p>
                    <p className="text-sm text-gray-400 mt-1">{tm("distributionIssueDesc")}</p>
                    {publishResult.distributionError && (
                      <p className="text-xs text-danger mt-2 font-mono bg-danger/5 rounded-lg px-3 py-1.5">
                        {publishResult.distributionError}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{tm("resendFromPicks")}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!publishResult && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            {step === 1 ? (
              <div className="flex gap-3">
                {mode !== "single" && (
                  <div className="flex-1 text-xs text-gray-400 flex items-center">
                    {mode === "parlay" && parlayLegs.length >= 2 && "Ready to compose"}
                    {mode === "parlay" && parlayLegs.length < 2 && `Need at least 2 legs (${parlayLegs.length}/2)`}
                    {mode === "multi" && queuedPicks.length >= 1 && `${queuedPicks.length} ready to send`}
                    {mode === "multi" && queuedPicks.length === 0 && "Queue is empty"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance || submitting}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                    "bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20",
                    mode === "single" ? "w-full" : "ml-auto"
                  )}
                >
                  {mode === "multi" ? (
                    <>
                      <Send className="h-4 w-4" />
                      {submitting ? "Sending…" : `Send ${queuedPicks.length > 0 ? `(${queuedPicks.length})` : ""}`}
                    </>
                  ) : (
                    <>
                      {t("next")}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
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
                  {sendOnPublish ? (
                    <>
                      <Send className="h-4 w-4" />
                      {submitting ? t("publishing") : tm("publishAndSend")}
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      {submitting ? t("publishing") : t("publishPick")}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
