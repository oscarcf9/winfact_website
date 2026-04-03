"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import DOMPurify from "dompurify";
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
  X,
  Copy,
  Check,
  Sparkles,
  Save,
  Send,
  BarChart3,
  ChevronDown,
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
  homeOdds: number | null;
  awayOdds: number | null;
  homeSpread: number | null;
  totalLine: number | null;
  overOdds: number | null;
  underOdds: number | null;
  pickStatus: string | null;
  pickId: string | null;
  edgeTier: string | null;
  fetchedAt: string | null;
};

type Props = {
  games: Game[];
  sports: string[];
};

const BET_TYPES = ["moneyline", "spread", "total", "team total", "player prop"];

function formatOdds(odds: number | null): string {
  if (odds == null) return "";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

// Sanitize AI output before rendering as HTML
function formatAnalysis(text: string): string {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-navy font-semibold">$1</strong>')
    .replace(/\n/g, "<br/>");
  return DOMPurify.sanitize(html);
}

export function IntelligenceDashboard({ games, sports }: Props) {
  const t = useTranslations("admin.intelligence");

  const [selectedSport, setSelectedSport] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  // Analysis panel state
  const [analyzingGame, setAnalyzingGame] = useState<Game | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Recap state
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapResult, setRecapResult] = useState("");
  const [showRecap, setShowRecap] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);

  const injuriesRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const betTypeRef = useRef<HTMLSelectElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = selectedSport === "All"
    ? games
    : games.filter((g) => g.sport === selectedSport);

  const strongEdge = games.filter((g) => g.edgeTier === "strong").length;
  const moderateEdge = games.filter((g) => g.edgeTier === "moderate").length;
  const posted = games.filter((g) => g.pickStatus === "posted").length;

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const res = await fetch("/api/admin/games-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Refresh failed");
      window.location.reload();
    } catch {
      setRefreshError(t("refreshError"));
      setRefreshing(false);
    }
  }

  function handleAnalyze(game: Game) {
    setAnalyzingGame(game);
    setAnalysisResult("");
    setAnalysisError("");
    setSaveMessage("");
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function handleGenerateAnalysis() {
    if (!analyzingGame) return;
    setAnalysisLoading(true);
    setAnalysisResult("");
    setAnalysisError("");

    const sharp = analyzingGame.sharpAction ? JSON.parse(analyzingGame.sharpAction) : null;
    const injuries = injuriesRef.current?.value || "";
    const capperNotes = notesRef.current?.value || "";
    const betTypePreference = betTypeRef.current?.value || "";

    const time = new Date(analyzingGame.commenceTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });

    try {
      const res = await fetch("/api/admin/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: analyzingGame.sport,
          matchup: `${analyzingGame.awayTeam} vs ${analyzingGame.homeTeam}`,
          gameTime: `${time} ET`,
          homeTeam: analyzingGame.homeTeam,
          awayTeam: analyzingGame.awayTeam,
          homeOdds: analyzingGame.homeOdds,
          awayOdds: analyzingGame.awayOdds,
          homeSpread: analyzingGame.homeSpread,
          totalLine: analyzingGame.totalLine,
          overOdds: analyzingGame.overOdds,
          underOdds: analyzingGame.underOdds,
          modelEdge: analyzingGame.modelEdge,
          sharpAction: sharp?.isSharp ? `${sharp.confidence}% confidence on ${sharp.side}` : undefined,
          injuries: injuries || undefined,
          capperNotes: capperNotes || undefined,
          betTypePreference: betTypePreference || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data.es || data.en || "");
      } else {
        setAnalysisError(data.error || "Failed to generate");
      }
    } catch {
      setAnalysisError("Network error");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleSavePick(publish: boolean) {
    if (!analyzingGame || !analysisResult) return;
    setSaving(true);
    setSaveMessage("");

    const pickMatch = analysisResult.match(/\*\*PICK:\*\*\s*(.+)/i);
    const confMatch = analysisResult.match(/\*\*CONFIANZA:\*\*\s*(.+)/i);
    const unitsMatch = analysisResult.match(/\*\*UNIDADES:\*\*\s*(\d+)/i);

    const pickText = pickMatch?.[1]?.trim() || `${analyzingGame.awayTeam} vs ${analyzingGame.homeTeam}`;
    const confRaw = confMatch?.[1]?.trim().toLowerCase() || "standard";
    const confidence = confRaw.includes("top") ? "top" : confRaw.includes("fuerte") || confRaw.includes("strong") ? "strong" : "standard";
    const units = unitsMatch ? parseInt(unitsMatch[1]) : undefined;

    try {
      const res = await fetch("/api/admin/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: analyzingGame.sport,
          matchup: `${analyzingGame.awayTeam} vs ${analyzingGame.homeTeam}`,
          pickText,
          gameDate: new Date().toISOString().split("T")[0],
          odds: analyzingGame.homeOdds || undefined,
          units: units || undefined,
          confidence,
          analysisEs: analysisResult,
          tier: "vip",
          status: publish ? "published" : "draft",
          distribute: publish,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMessage(publish ? t("pickPublished") : t("pickSaved"));
        if (publish) {
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        setSaveMessage(data.error || "Failed to save");
      }
    } catch {
      setSaveMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  async function handleRecap() {
    setRecapLoading(true);
    setRecapResult("");
    setShowRecap(true);
    try {
      const res = await fetch("/api/admin/ai/recap", { method: "POST" });
      const data = await res.json();
      if (res.ok) setRecapResult(data.es || data.en || "");
      else setRecapResult("Error: " + (data.error || "Failed"));
    } catch {
      setRecapResult("Network error");
    } finally {
      setRecapLoading(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecap}
            disabled={recapLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {recapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {t("weeklyRecap")}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("refreshGames")}
          </button>
        </div>
      </div>

      {/* Refresh Error */}
      {refreshError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {refreshError}
        </div>
      )}

      {/* Weekly Recap Panel */}
      {showRecap && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-navy flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("weeklyRecap")}
            </h2>
            <button onClick={() => setShowRecap(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="p-6">
            {recapLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            )}
            {!recapLoading && recapResult && (
              <div className="space-y-3">
                <div
                  className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatAnalysis(recapResult) }}
                />
                <button
                  onClick={() => handleCopy(recapResult, setRecapCopied)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer"
                >
                  {recapCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {recapCopied ? t("copied") : t("copy")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
            const time = new Date(game.commenceTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: "America/New_York",
            });
            const isAnalyzing = analyzingGame?.id === game.id;

            return (
              <div
                key={game.id}
                className={`relative rounded-2xl bg-white border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                  isAnalyzing
                    ? "border-primary/40 ring-2 ring-primary/20"
                    : game.edgeTier === "strong"
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
                  <div className="mb-3">
                    <p className="font-semibold text-navy text-base">{game.awayTeam}</p>
                    <p className="text-gray-400 text-xs my-0.5">{t("at")}</p>
                    <p className="font-semibold text-navy text-base">{game.homeTeam}</p>
                  </div>

                  {/* Odds Row */}
                  {(game.homeOdds != null || game.homeSpread != null || game.totalLine != null) && (
                    <div className="flex flex-wrap gap-3 mb-3 text-xs">
                      {game.homeOdds != null && game.awayOdds != null && (
                        <div>
                          <span className="text-gray-400">{t("moneyline")}</span>{" "}
                          <span className="font-mono font-semibold text-navy">{formatOdds(game.homeOdds)}/{formatOdds(game.awayOdds)}</span>
                        </div>
                      )}
                      {game.homeSpread != null && (
                        <div>
                          <span className="text-gray-400">{t("spread")}</span>{" "}
                          <span className="font-mono font-semibold text-navy">{formatOdds(game.homeSpread)}</span>
                        </div>
                      )}
                      {game.totalLine != null && (
                        <div>
                          <span className="text-gray-400">{t("total")}</span>{" "}
                          <span className="font-mono font-semibold text-navy">{game.totalLine}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      game.edgeTier === "strong"
                        ? "bg-success/15 text-success border border-success/20"
                        : game.edgeTier === "moderate"
                          ? "bg-warning/15 text-warning border border-warning/20"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {game.edgeTier === "strong" ? t("strongEdge") : game.edgeTier === "moderate" ? t("moderate") : t("noEdge")}
                    </span>

                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      game.pickStatus === "posted"
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : game.pickStatus === "skip"
                          ? "bg-gray-100 text-gray-400 border border-gray-200"
                          : "bg-accent/10 text-accent border border-accent/20"
                    }`}>
                      {game.pickStatus === "posted" ? t("pickPosted") : game.pickStatus === "skip" ? t("skipped") : t("pendingStatus")}
                    </span>

                    {sharp?.isSharp && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                        {t("sharpAction")}
                      </span>
                    )}
                  </div>

                  {/* Injuries indicator */}
                  {injuries.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-warning mb-3">
                      <AlertTriangle className="h-3 w-3" />
                      {injuries.length} {injuries.length > 1 ? t("injuryUpdates") : t("injuryUpdate")}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {game.pickStatus === "posted" ? (
                      <Link
                        href="/admin/picks"
                        className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("viewPick")}
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/admin/picks/new?sport=${encodeURIComponent(game.sport)}&matchup=${encodeURIComponent(`${game.awayTeam} vs ${game.homeTeam}`)}`}
                          className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200"
                        >
                          <Target className="h-3.5 w-3.5" />
                          {t("quickPick")}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleAnalyze(game)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                            isAnalyzing
                              ? "bg-primary text-white"
                              : "bg-accent/10 text-accent hover:bg-accent/20"
                          }`}
                        >
                          <Bot className="h-3.5 w-3.5" />
                          {t("analyze")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Analysis Panel */}
      {analyzingGame && (
        <div ref={panelRef} className="rounded-2xl bg-white border border-primary/20 shadow-lg overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
            <div>
              <h2 className="font-heading font-bold text-lg text-navy flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {t("analysisPanel")}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {analyzingGame.awayTeam} vs {analyzingGame.homeTeam} &mdash; {analyzingGame.sport}
              </p>
            </div>
            <button
              onClick={() => { setAnalyzingGame(null); setAnalysisResult(""); setAnalysisError(""); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x lg:divide-gray-200">
            {/* Context (left) */}
            <div className="p-6 space-y-4">
              {/* Auto-filled odds context */}
              {(analyzingGame.homeOdds != null || analyzingGame.homeSpread != null || analyzingGame.totalLine != null) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  {analyzingGame.homeOdds != null && analyzingGame.awayOdds != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("moneyline")}</span>
                      <span className="font-mono font-semibold text-navy">
                        {analyzingGame.homeTeam} {formatOdds(analyzingGame.homeOdds)} / {analyzingGame.awayTeam} {formatOdds(analyzingGame.awayOdds)}
                      </span>
                    </div>
                  )}
                  {analyzingGame.homeSpread != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("spread")}</span>
                      <span className="font-mono font-semibold text-navy">{analyzingGame.homeTeam} {formatOdds(analyzingGame.homeSpread)}</span>
                    </div>
                  )}
                  {analyzingGame.totalLine != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("total")}</span>
                      <span className="font-mono font-semibold text-navy">
                        {analyzingGame.totalLine} (O {formatOdds(analyzingGame.overOdds)} / U {formatOdds(analyzingGame.underOdds)})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Editable fields */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("injuries")}</label>
                <textarea
                  ref={injuriesRef}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-y"
                  placeholder="LeBron James (ankle) - Questionable..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("capperNotes")}</label>
                <textarea
                  ref={notesRef}
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-y"
                  placeholder="Team on B2B, revenge spot..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-500 mb-1.5">{t("betType")}</label>
                <select
                  ref={betTypeRef}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="">{t("anyMarket")}</option>
                  {BET_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={handleGenerateAnalysis}
                disabled={analysisLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer w-full justify-center"
              >
                {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analysisLoading ? t("generating") : t("generateAnalysis")}
              </button>
            </div>

            {/* Output (right) */}
            <div className="p-6">
              {analysisLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-sm text-gray-400">{t("generating")}</p>
                </div>
              )}

              {!analysisLoading && analysisError && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                  {analysisError}
                </div>
              )}

              {!analysisLoading && !analysisResult && !analysisError && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-gray-200 mb-4" />
                  <p className="text-sm text-gray-400">{t("generateAnalysis")}</p>
                </div>
              )}

              {!analysisLoading && analysisResult && (
                <div className="space-y-4">
                  <div
                    className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisResult) }}
                  />

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSavePick(false)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {t("saveAsDraft")}
                    </button>
                    <button
                      onClick={() => handleSavePick(true)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t("publishAndSend")}
                    </button>
                    <button
                      onClick={() => handleCopy(analysisResult, setCopied)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? t("copied") : t("copy")}
                    </button>
                  </div>

                  {saveMessage && (
                    <div className={`text-sm px-3 py-2 rounded-lg ${
                      saveMessage.includes("error") || saveMessage.includes("Error") || saveMessage.includes("Network")
                        ? "bg-danger/10 text-danger"
                        : "bg-success/10 text-success"
                    }`}>
                      {saveMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
