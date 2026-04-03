"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Search,
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

type Enrichment = {
  venue: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
  homeHomeRecord: string | null;
  awayAwayRecord: string | null;
  homeForm: string[];
  awayForm: string[];
  homeInjuries: { player: string; position: string; status: string; detail: string }[];
  awayInjuries: { player: string; position: string; status: string; detail: string }[];
  headlines: string[];
  cachedOdds: Record<string, unknown>;
  bookmakers: { name: string; markets: Record<string, { name: string; price: number; point?: number }[]> }[];
  bestLines: {
    homeML: { price: number; book: string } | null;
    awayML: { price: number; book: string } | null;
    homeSpread: { point: number; price: number; book: string } | null;
    total: { point: number; overPrice: number; underPrice: number; overBook: string; underBook: string } | null;
  } | null;
  sharpAction: { isSharp: boolean; side: string; confidence: number } | null;
};

type Props = {
  games: Game[];
  sports: string[];
};

const BET_TYPES = ["moneyline", "spread", "total", "team total", "player prop"];

function fmtOdds(odds: number | null | undefined): string {
  if (odds == null) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

// All AI output is sanitized with DOMPurify before rendering
function formatAnalysis(text: string): string {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-navy font-semibold">$1</strong>')
    .replace(/\n/g, "<br/>");
  return DOMPurify.sanitize(html);
}

function edgeOrder(tier: string | null): number {
  if (tier === "strong") return 0;
  if (tier === "moderate") return 1;
  return 2;
}

function gameTime(commenceTime: string): string {
  return new Date(commenceTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

export function IntelligenceDashboard({ games, sports }: Props) {
  const t = useTranslations("admin.intelligence");

  const [selectedSport, setSelectedSport] = useState("All");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  // Drawer state
  const [drawerGame, setDrawerGame] = useState<Game | null>(null);
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
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

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const betTypeRef = useRef<HTMLSelectElement>(null);

  // Filter and sort games
  const filtered = games
    .filter((g) => selectedSport === "All" || g.sport === selectedSport)
    .filter((g) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return g.homeTeam.toLowerCase().includes(s) || g.awayTeam.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const ea = edgeOrder(a.edgeTier);
      const eb = edgeOrder(b.edgeTier);
      if (ea !== eb) return ea - eb;
      return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
    });

  const strongEdge = games.filter((g) => g.edgeTier === "strong").length;
  const moderateEdge = games.filter((g) => g.edgeTier === "moderate").length;
  const posted = games.filter((g) => g.pickStatus === "posted").length;

  const closeDrawer = useCallback(() => {
    setDrawerGame(null);
    setEnrichment(null);
    setAnalysisResult("");
    setAnalysisError("");
    setSaveMessage("");
  }, []);

  // Close drawer on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerGame) {
        closeDrawer();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerGame, closeDrawer]);

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

  async function handleAnalyze(game: Game) {
    setDrawerGame(game);
    setAnalysisResult("");
    setAnalysisError("");
    setSaveMessage("");
    setEnrichment(null);
    setEnrichLoading(true);

    try {
      const res = await fetch("/api/admin/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnrichment(data);
      }
    } catch {
      // Enrichment is best-effort — drawer still works with cached odds
    } finally {
      setEnrichLoading(false);
    }
  }

  async function handleGenerateAnalysis() {
    if (!drawerGame) return;
    setAnalysisLoading(true);
    setAnalysisResult("");
    setAnalysisError("");

    const capperNotes = notesRef.current?.value || "";
    const betTypePreference = betTypeRef.current?.value || "";
    const time = gameTime(drawerGame.commenceTime);

    // Build injuries string from enrichment
    let injuriesStr = "";
    if (enrichment) {
      const parts: string[] = [];
      if (enrichment.homeInjuries.length > 0) {
        parts.push(`${drawerGame.homeTeam}:`);
        enrichment.homeInjuries.forEach((inj) => {
          parts.push(`  - ${inj.player} (${inj.position}) — ${inj.status}: ${inj.detail}`);
        });
      }
      if (enrichment.awayInjuries.length > 0) {
        parts.push(`${drawerGame.awayTeam}:`);
        enrichment.awayInjuries.forEach((inj) => {
          parts.push(`  - ${inj.player} (${inj.position}) — ${inj.status}: ${inj.detail}`);
        });
      }
      injuriesStr = parts.join("\n") || "No hay lesiones reportadas.";
    }

    // Build bookmaker comparison string
    let bookmakerComparison = "";
    if (enrichment?.bestLines) {
      const bl = enrichment.bestLines;
      const lines: string[] = [];
      if (bl.homeML) lines.push(`Mejor ML ${drawerGame.homeTeam}: ${fmtOdds(bl.homeML.price)} (${bl.homeML.book})`);
      if (bl.awayML) lines.push(`Mejor ML ${drawerGame.awayTeam}: ${fmtOdds(bl.awayML.price)} (${bl.awayML.book})`);
      if (bl.homeSpread) lines.push(`Mejor Spread: ${drawerGame.homeTeam} ${fmtOdds(bl.homeSpread.point)} (${fmtOdds(bl.homeSpread.price)}) @ ${bl.homeSpread.book}`);
      if (bl.total) lines.push(`Mejor Total: O/U ${bl.total.point} — Over ${fmtOdds(bl.total.overPrice)} @ ${bl.total.overBook}, Under ${fmtOdds(bl.total.underPrice)} @ ${bl.total.underBook}`);
      bookmakerComparison = lines.join("\n") || "Solo un libro disponible.";
    }

    const sharp = enrichment?.sharpAction;

    // Use fresh enrichment odds as fallback when DB cache is null
    const bl = enrichment?.bestLines;
    const homeOdds = drawerGame.homeOdds ?? bl?.homeML?.price ?? null;
    const awayOdds = drawerGame.awayOdds ?? bl?.awayML?.price ?? null;
    const homeSpread = drawerGame.homeSpread ?? bl?.homeSpread?.point ?? null;
    const totalLine = drawerGame.totalLine ?? bl?.total?.point ?? null;
    const overOdds = drawerGame.overOdds ?? bl?.total?.overPrice ?? null;
    const underOdds = drawerGame.underOdds ?? bl?.total?.underPrice ?? null;

    try {
      const res = await fetch("/api/admin/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: drawerGame.sport,
          matchup: `${drawerGame.awayTeam} vs ${drawerGame.homeTeam}`,
          gameTime: `${time} ET`,
          homeTeam: drawerGame.homeTeam,
          awayTeam: drawerGame.awayTeam,
          homeOdds,
          awayOdds,
          homeSpread,
          totalLine,
          overOdds,
          underOdds,
          modelEdge: drawerGame.modelEdge,
          venue: enrichment?.venue || drawerGame.venue,
          homeRecord: enrichment?.homeRecord,
          awayRecord: enrichment?.awayRecord,
          homeHomeRecord: enrichment?.homeHomeRecord,
          awayAwayRecord: enrichment?.awayAwayRecord,
          homeForm: enrichment?.homeForm,
          awayForm: enrichment?.awayForm,
          injuries: injuriesStr || undefined,
          bookmakerComparison: bookmakerComparison || undefined,
          headlines: enrichment?.headlines,
          sharpAction: sharp?.isSharp ? `${sharp.confidence.toFixed(0)}% confidence on ${sharp.side}` : undefined,
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
    if (!drawerGame || !analysisResult) return;
    setSaving(true);
    setSaveMessage("");

    const pickMatch = analysisResult.match(/\*\*PICK:\*\*\s*(.+)/i);
    const confMatch = analysisResult.match(/\*\*CONFIANZA:\*\*\s*(.+)/i);
    const unitsMatch = analysisResult.match(/\*\*UNIDADES:\*\*\s*(\d+)/i);

    const pickText = pickMatch?.[1]?.trim() || `${drawerGame.awayTeam} vs ${drawerGame.homeTeam}`;
    const confRaw = confMatch?.[1]?.trim().toLowerCase() || "standard";
    const confidence = confRaw.includes("top") ? "top" : confRaw.includes("fuerte") || confRaw.includes("strong") ? "strong" : "standard";
    const units = unitsMatch ? parseInt(unitsMatch[1]) : undefined;

    try {
      const res = await fetch("/api/admin/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: drawerGame.sport,
          matchup: `${drawerGame.awayTeam} vs ${drawerGame.homeTeam}`,
          pickText,
          gameDate: new Date().toISOString().split("T")[0],
          odds: drawerGame.homeOdds || undefined,
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
    <div className="space-y-6 animate-fade-up">
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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatAnalysis(recapResult)) }}
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

      {/* Search + Sport Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchGames")}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
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
      </div>

      {/* Compact Game List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 text-center">
          <Activity className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm mb-2">{t("noGames")}</p>
          <p className="text-gray-300 text-xs">{t("noGamesHint")}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[40px_80px_1fr_80px_120px_100px_90px_100px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div></div>
            <div>{t("sportLabel")}</div>
            <div>{t("matchupLabel")}</div>
            <div>{t("timeLabel")}</div>
            <div>ML</div>
            <div>{t("spread")}</div>
            <div>O/U</div>
            <div></div>
          </div>

          {/* Game Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((game) => {
              const isActive = drawerGame?.id === game.id;
              const isPosted = game.pickStatus === "posted";

              return (
                <div
                  key={game.id}
                  onClick={() => { if (!isPosted) handleAnalyze(game); }}
                  className={`group transition-colors duration-150 ${
                    isPosted ? "cursor-default" : "cursor-pointer"
                  } ${
                    isActive
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : isPosted
                        ? "bg-success/[0.03]"
                        : "hover:bg-gray-50 border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[40px_80px_1fr_80px_120px_100px_90px_100px] gap-2 px-4 py-3 items-center">
                    {/* Edge indicator */}
                    <div className="flex justify-center">
                      {game.edgeTier === "strong" ? (
                        <Zap className="h-4 w-4 text-success" />
                      ) : game.edgeTier === "moderate" ? (
                        <Zap className="h-4 w-4 text-warning" />
                      ) : isPosted ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>

                    {/* Sport */}
                    <div className="text-xs font-semibold text-gray-400 uppercase">{game.sport}</div>

                    {/* Matchup */}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-navy truncate">
                        {game.awayTeam} <span className="text-gray-400 font-normal">at</span> {game.homeTeam}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {gameTime(game.commenceTime)}
                    </div>

                    {/* Moneyline */}
                    <div className="font-mono text-xs text-navy">
                      {game.homeOdds != null && game.awayOdds != null
                        ? `${fmtOdds(game.awayOdds)}/${fmtOdds(game.homeOdds)}`
                        : "—"}
                    </div>

                    {/* Spread */}
                    <div className="font-mono text-xs text-navy">
                      {game.homeSpread != null ? fmtOdds(game.homeSpread) : "—"}
                    </div>

                    {/* Total */}
                    <div className="font-mono text-xs text-navy">
                      {game.totalLine != null ? String(game.totalLine) : "—"}
                    </div>

                    {/* Action Button */}
                    <div>
                      {isPosted ? (
                        <Link
                          href="/admin/picks"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          {t("viewPick")}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleAnalyze(game)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isActive
                              ? "bg-primary text-white"
                              : "bg-accent/10 text-accent hover:bg-accent/20"
                          }`}
                        >
                          <Bot className="h-3 w-3" />
                          {t("analyze")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile Row */}
                  <div className="md:hidden px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {game.edgeTier === "strong" ? (
                          <Zap className="h-3.5 w-3.5 text-success" />
                        ) : game.edgeTier === "moderate" ? (
                          <Zap className="h-3.5 w-3.5 text-warning" />
                        ) : null}
                        <span className="text-xs font-semibold text-gray-400 uppercase">{game.sport}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {gameTime(game.commenceTime)}
                        </span>
                      </div>
                      {isPosted ? (
                        <Link href="/admin/picks" className="text-xs text-primary font-medium">
                          {t("viewPick")}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleAnalyze(game)}
                          className={`text-xs font-medium cursor-pointer ${isActive ? "text-primary" : "text-accent"}`}
                        >
                          {t("analyze")}
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-navy">
                      {game.awayTeam} <span className="text-gray-400 font-normal">at</span> {game.homeTeam}
                    </div>
                    <div className="flex gap-3 text-xs font-mono text-gray-500">
                      {game.homeOdds != null && <span>ML: {fmtOdds(game.awayOdds)}/{fmtOdds(game.homeOdds)}</span>}
                      {game.homeSpread != null && <span>Spr: {fmtOdds(game.homeSpread)}</span>}
                      {game.totalLine != null && <span>O/U: {game.totalLine}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Drawer (right side) */}
      {drawerGame && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="min-w-0">
                <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2 truncate">
                  <Bot className="h-5 w-5 text-primary shrink-0" />
                  {t("analysisPanel")}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {drawerGame.awayTeam} vs {drawerGame.homeTeam} — {drawerGame.sport}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Loading enrichment */}
              {enrichLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="ml-2 text-sm text-gray-400">{t("loadingGameData")}</span>
                </div>
              )}

              {/* Enrichment Data Sections */}
              {!enrichLoading && (
                <>
                  {/* Market Data — prefer fresh enrichment odds over DB cache */}
                  <section className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <h3 className="font-semibold text-navy text-xs uppercase tracking-wider mb-2">{t("marketData")}</h3>
                    {(() => {
                      const ebl = enrichment?.bestLines;
                      const dHomeOdds = drawerGame.homeOdds ?? ebl?.homeML?.price ?? null;
                      const dAwayOdds = drawerGame.awayOdds ?? ebl?.awayML?.price ?? null;
                      const dSpread = drawerGame.homeSpread ?? ebl?.homeSpread?.point ?? null;
                      const dTotal = drawerGame.totalLine ?? ebl?.total?.point ?? null;
                      const dOverOdds = drawerGame.overOdds ?? ebl?.total?.overPrice ?? null;
                      const dUnderOdds = drawerGame.underOdds ?? ebl?.total?.underPrice ?? null;
                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Moneyline</span>
                            <span className="font-mono font-semibold text-navy">
                              {dHomeOdds != null
                                ? `${drawerGame.homeTeam} ${fmtOdds(dHomeOdds)} / ${drawerGame.awayTeam} ${fmtOdds(dAwayOdds)}`
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Spread</span>
                            <span className="font-mono font-semibold text-navy">
                              {dSpread != null ? `${drawerGame.homeTeam} ${fmtOdds(dSpread)}` : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total</span>
                            <span className="font-mono font-semibold text-navy">
                              {dTotal != null
                                ? `${dTotal} (O ${fmtOdds(dOverOdds)} / U ${fmtOdds(dUnderOdds)})`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Best lines from bookmakers */}
                    {enrichment?.bestLines && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase">{t("bestLines")}</p>
                        {enrichment.bestLines.homeML && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Best {drawerGame.homeTeam} ML</span>
                            <span className="font-mono text-success">{fmtOdds(enrichment.bestLines.homeML.price)} <span className="text-gray-400">@ {enrichment.bestLines.homeML.book}</span></span>
                          </div>
                        )}
                        {enrichment.bestLines.awayML && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Best {drawerGame.awayTeam} ML</span>
                            <span className="font-mono text-success">{fmtOdds(enrichment.bestLines.awayML.price)} <span className="text-gray-400">@ {enrichment.bestLines.awayML.book}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Team Records */}
                  {enrichment && (enrichment.homeRecord || enrichment.awayRecord) && (
                    <section className="bg-gray-50 rounded-xl p-4 text-sm">
                      <h3 className="font-semibold text-navy text-xs uppercase tracking-wider mb-2">{t("teamRecords")}</h3>
                      <div className="space-y-1.5">
                        {enrichment.homeRecord && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">{drawerGame.homeTeam}</span>
                            <span className="font-semibold text-navy">
                              {enrichment.homeRecord}
                              {enrichment.homeHomeRecord && <span className="text-gray-400 font-normal ml-1">(H: {enrichment.homeHomeRecord})</span>}
                            </span>
                          </div>
                        )}
                        {enrichment.awayRecord && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">{drawerGame.awayTeam}</span>
                            <span className="font-semibold text-navy">
                              {enrichment.awayRecord}
                              {enrichment.awayAwayRecord && <span className="text-gray-400 font-normal ml-1">(A: {enrichment.awayAwayRecord})</span>}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Recent form */}
                      {(enrichment.homeForm.length > 0 || enrichment.awayForm.length > 0) && (
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                          {enrichment.homeForm.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-20 truncate">{drawerGame.homeTeam}</span>
                              <div className="flex gap-0.5">
                                {enrichment.homeForm.map((f, i) => (
                                  <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                    f === "W" ? "bg-success/15 text-success" : f === "L" ? "bg-danger/15 text-danger" : "bg-gray-100 text-gray-500"
                                  }`}>{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {enrichment.awayForm.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-20 truncate">{drawerGame.awayTeam}</span>
                              <div className="flex gap-0.5">
                                {enrichment.awayForm.map((f, i) => (
                                  <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                    f === "W" ? "bg-success/15 text-success" : f === "L" ? "bg-danger/15 text-danger" : "bg-gray-100 text-gray-500"
                                  }`}>{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Injuries */}
                  {enrichment && (enrichment.homeInjuries.length > 0 || enrichment.awayInjuries.length > 0) && (
                    <section className="bg-gray-50 rounded-xl p-4 text-sm">
                      <h3 className="font-semibold text-navy text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        {t("injuries")}
                      </h3>
                      <div className="space-y-2">
                        {enrichment.homeInjuries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">{drawerGame.homeTeam}</p>
                            {enrichment.homeInjuries.map((inj, i) => (
                              <p key={i} className="text-xs text-gray-600 ml-2">
                                {inj.player} ({inj.position}) — <span className={inj.status === "Out" ? "text-danger" : "text-warning"}>{inj.status}</span>
                                {inj.detail && <span className="text-gray-400"> · {inj.detail}</span>}
                              </p>
                            ))}
                          </div>
                        )}
                        {enrichment.awayInjuries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">{drawerGame.awayTeam}</p>
                            {enrichment.awayInjuries.map((inj, i) => (
                              <p key={i} className="text-xs text-gray-600 ml-2">
                                {inj.player} ({inj.position}) — <span className={inj.status === "Out" ? "text-danger" : "text-warning"}>{inj.status}</span>
                                {inj.detail && <span className="text-gray-400"> · {inj.detail}</span>}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* No enrichment data notice */}
                  {!enrichment && !enrichLoading && (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
                      {t("noEnrichmentData")}
                    </div>
                  )}

                  {/* Capper Inputs */}
                  <section className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t("capperNotes")}</label>
                      <textarea
                        ref={notesRef}
                        rows={2}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-y"
                        placeholder="Revenge spot, B2B, coach fired..."
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t("betType")}</label>
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
                  </section>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateAnalysis}
                    disabled={analysisLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer w-full justify-center"
                  >
                    {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {analysisLoading ? t("generating") : t("generateAnalysis")}
                  </button>

                  {/* Analysis Output */}
                  {analysisLoading && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                      <p className="text-sm text-gray-400">{t("generating")}</p>
                    </div>
                  )}

                  {!analysisLoading && analysisError && (
                    <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                      {analysisError}
                    </div>
                  )}

                  {!analysisLoading && analysisResult && (
                    <div className="space-y-4">
                      <div
                        className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatAnalysis(analysisResult)) }}
                      />

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
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
