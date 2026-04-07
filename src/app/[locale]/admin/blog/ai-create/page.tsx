"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Trophy,
  Radio,
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

type Step = "select" | "configure" | "generating" | "done";

const POST_TYPES = [
  { id: "game_preview", label: "Game Preview", desc: "Pre-game analysis with odds, injuries, trends" },
  { id: "rivalry_breakdown", label: "Rivalry Breakdown", desc: "Historical matchup context and storylines" },
  { id: "betting_guide", label: "Betting Guide", desc: "Lines, edges, and value breakdown" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual / Fan" },
  { id: "data_heavy", label: "Data-Heavy" },
];

const SPORT_ICONS: Record<string, string> = {
  NBA: "🏀", MLB: "⚾", NFL: "🏈", NHL: "🏒", Soccer: "⚽",
  NCAAF: "🏈", NCAAB: "🏀", MLS: "⚽",
  "Premier League": "⚽", "La Liga": "⚽", "Serie A": "⚽",
  "Bundesliga": "⚽", "Champions League": "⚽", "Liga MX": "⚽",
};

export default function AiCreateBlogPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");

  // Step 1: Game selection
  const [leagueData, setLeagueData] = useState<LeagueGames[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [sportFilter, setSportFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<ESPNGame | null>(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [customMatchup, setCustomMatchup] = useState("");
  const [customSport, setCustomSport] = useState("NBA");
  const [useCustom, setUseCustom] = useState(false);

  // Step 2: Config
  const [postType, setPostType] = useState("game_preview");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("both");
  const [includeOdds, setIncludeOdds] = useState(true);
  const [includeInjuries, setIncludeInjuries] = useState(true);
  const [includeForm, setIncludeForm] = useState(true);

  // Step 3: Generation
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [genResult, setGenResult] = useState<{
    postId: string;
    slug: string;
    title: string;
    featuredImage: string | null;
  } | null>(null);
  const [genError, setGenError] = useState("");

  // Fetch games from ESPN scoreboard (same source as dashboard)
  useEffect(() => {
    async function loadGames() {
      try {
        const res = await fetch("/api/admin/games-scoreboard");
        if (!res.ok) throw new Error("Failed to fetch games");
        const data: LeagueGames[] = await res.json();
        setLeagueData(Array.isArray(data) ? data : []);
      } catch {
        console.error("Failed to load games");
      } finally {
        setLoadingGames(false);
      }
    }
    loadGames();
  }, []);

  const sports = ["All", ...new Set(leagueData.map(ld => ld.league))];

  const filteredLeagues = leagueData
    .map(ld => ({
      ...ld,
      games: ld.games.filter(g => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return g.homeTeam.toLowerCase().includes(q) || g.awayTeam.toLowerCase().includes(q);
        }
        return true;
      }),
    }))
    .filter(ld => {
      if (sportFilter !== "All" && ld.league !== sportFilter) return false;
      return ld.games.length > 0;
    });

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });
  }

  const matchup = useCustom
    ? customMatchup
    : selectedGame
    ? `${selectedGame.awayTeam} vs ${selectedGame.homeTeam}`
    : "";

  const sport = useCustom ? customSport : selectedLeague || "";

  const canProceed = step === "select" && (selectedGame || (useCustom && customMatchup.trim()));

  // Generate blog
  const handleGenerate = useCallback(async () => {
    if (!matchup || !sport) return;
    setStep("generating");
    setGenerating(true);
    setGenError("");
    setGenStatus("Enriching with real game data...");

    try {
      const res = await fetch("/api/admin/auto-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          league: sport,
          matchup,
          pickText: `AI Blog: ${matchup}`,
          gameDate: selectedGame?.startTime?.split("T")[0] || null,
          odds: null,
          tier: "free",
          // Pass config as metadata
          blogConfig: { postType, tone, language, includeOdds, includeInjuries, includeForm },
        }),
      });

      setGenStatus("Generating blog content + image...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGenResult({
        postId: data.postId,
        slug: data.slug,
        title: data.title,
        featuredImage: data.featuredImage,
      });
      setStep("done");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
      setStep("configure");
    } finally {
      setGenerating(false);
    }
  }, [matchup, sport, selectedGame, postType, tone, language, includeOdds, includeInjuries, includeForm]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up p-4">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/admin/blog")} className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600">
          <ArrowLeft className="h-3 w-3" /> Back to Blog
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          <Sparkles className="mb-1 mr-2 inline h-5 w-5 text-blue-600" />
          <span className="text-blue-600">Create Blog with AI</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">Select a game, configure style, and AI generates a full blog post with image</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: "select", label: "1. Select Game" },
          { id: "configure", label: "2. Configure" },
          { id: "generating", label: "3. Generate" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              step === s.id || (step === "done" && s.id === "generating")
                ? "bg-blue-100 text-blue-700"
                : (step as string) === "done" || (s.id === "select" && step !== "select") || (s.id === "configure" && ((step as string) === "generating" || (step as string) === "done"))
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-400"
            )}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: Select Game ═══ */}
      {step === "select" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Today's Games</h3>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-xs text-blue-600 hover:underline"
              >
                {useCustom ? "← Pick from list" : "Custom matchup →"}
              </button>
            </div>

            {useCustom ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <select
                    value={customSport}
                    onChange={e => setCustomSport(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {["NBA", "MLB", "NFL", "NHL", "Soccer", "NCAAF", "NCAAB"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customMatchup}
                    onChange={e => setCustomMatchup(e.target.value)}
                    placeholder="e.g. Lakers vs Celtics"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {sports.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSportFilter(s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition",
                        sportFilter === s
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {s !== "All" && SPORT_ICONS[s] ? `${SPORT_ICONS[s]} ` : ""}{s}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search teams..."
                      className="w-32 border-none bg-transparent text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Games list */}
                {loadingGames ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  </div>
                ) : filteredLeagues.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No games found. Try a custom matchup instead.</p>
                ) : (
                  <div className="max-h-[400px] space-y-3 overflow-y-auto">
                    {filteredLeagues.map(ld => (
                      <div key={ld.league}>
                        <p className="mb-1 text-xs font-semibold text-gray-500">
                          {SPORT_ICONS[ld.league] || "🏟"} {ld.league} — {ld.games.length} {ld.games.length === 1 ? "game" : "games"}
                        </p>
                        <div className="space-y-1.5">
                          {ld.games.map(game => {
                            const isSelected = selectedGame?.id === game.id;
                            return (
                              <button
                                key={game.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedGame(null);
                                    setSelectedLeague("");
                                  } else {
                                    setSelectedGame(game);
                                    setSelectedLeague(ld.league);
                                  }
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                                  isSelected
                                    ? "border-2 border-blue-500 bg-blue-50"
                                    : "border border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                )}
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-800">
                                    {game.awayTeam} <span className="text-gray-400">@</span> {game.homeTeam}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {game.status === "pre"
                                      ? `${formatTime(game.startTime)} ET`
                                      : game.status === "in"
                                      ? `LIVE · ${game.awayScore}-${game.homeScore}`
                                      : `Final · ${game.awayScore}-${game.homeScore}`}
                                  </p>
                                </div>
                                {game.status === "in" && <Radio className="h-4 w-4 text-red-500 animate-pulse" />}
                                {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Next button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep("configure")}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              Next: Configure <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Configure ═══ */}
      {step === "configure" && (
        <div className="space-y-4">
          {/* Selected game banner */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <Trophy className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">{matchup}</p>
              <p className="text-xs text-blue-600">{sport}</p>
            </div>
            <button type="button" onClick={() => setStep("select")} className="ml-auto text-xs text-blue-600 hover:underline">Change</button>
          </div>

          {/* Post type */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Post Type</h3>
            <div className="space-y-2">
              {POST_TYPES.map(pt => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPostType(pt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition",
                    postType === pt.id
                      ? "border-2 border-blue-500 bg-blue-50"
                      : "border border-gray-100 hover:bg-gray-50"
                  )}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{pt.label}</p>
                    <p className="text-xs text-gray-500">{pt.desc}</p>
                  </div>
                  {postType === pt.id && <CheckCircle className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tone + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Tone</h3>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition",
                      tone === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Language</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "both", label: "EN + ES" },
                  { id: "en", label: "English only" },
                  { id: "es", label: "Spanish only" },
                ].map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition",
                      language === l.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Include toggles */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Include in Analysis</h3>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Odds comparison", checked: includeOdds, toggle: setIncludeOdds },
                { label: "Injury report", checked: includeInjuries, toggle: setIncludeInjuries },
                { label: "Recent form", checked: includeForm, toggle: setIncludeForm },
              ].map(item => (
                <label key={item.label} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => item.toggle(!item.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {genError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {genError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              <Sparkles className="h-4 w-4" /> Generate Blog Post
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Generating ═══ */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <div className="relative mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-cyan-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">Generating your blog post...</p>
          <p className="mt-1 text-xs text-gray-400">{genStatus}</p>
          <p className="mt-4 text-xs text-gray-400">This takes 15-45 seconds</p>
        </div>
      )}

      {/* ═══ STEP 4: Done ═══ */}
      {step === "done" && genResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center shadow-sm">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">Blog Post Created!</h2>
            <p className="mt-1 text-sm text-green-600">"{genResult.title}" saved as draft</p>
          </div>

          {genResult.featuredImage && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <img src={genResult.featuredImage} alt="Featured" className="h-48 w-full object-cover" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/admin/blog/${genResult.postId}`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Edit & Review Draft
            </button>
            <button
              type="button"
              onClick={() => { setStep("select"); setSelectedGame(null); setGenResult(null); }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
