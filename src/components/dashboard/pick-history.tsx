"use client";

import { useState, useMemo } from "react";
import { PickCard } from "@/components/dashboard/pick-card";
import {
  History,
  Trophy,
  XCircle,
  MinusCircle,
  TrendingUp,
  SearchX,
  ChevronDown,
  Calendar,
  CalendarDays,
  Lock,
  Crown,
} from "lucide-react";

type Pick = {
  id: string;
  sport: string;
  league?: string | null;
  matchup: string;
  pickText: string;
  gameDate?: string | null;
  odds?: number | null;
  units?: number | null;
  modelEdge?: number | null;
  confidence?: "top" | "strong" | "standard" | null;
  analysisEn?: string | null;
  analysisEs?: string | null;
  tier?: "free" | "vip" | null;
  status?: "draft" | "published" | "settled" | null;
  result?: "win" | "loss" | "push" | null;
  closingOdds?: number | null;
  clv?: number | null;
  publishedAt?: string | null;
  settledAt?: string | null;
  createdAt?: string | null;
};

type Props = {
  picks: Pick[];
  locale: string;
  isVip: boolean;
};

type GroupMode = "day" | "month";

const SPORTS = ["All", "MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];
const RESULTS = [
  { label: "All", value: "" },
  { label: "Win", value: "win" },
  { label: "Loss", value: "loss" },
  { label: "Push", value: "push" },
];

function getDateKey(pick: Pick, mode: GroupMode): string {
  const raw = pick.settledAt || pick.gameDate || pick.publishedAt || pick.createdAt || "";
  if (!raw) return "Unknown";
  const dateStr = raw.split("T")[0]; // "2026-03-10"
  if (mode === "month") return dateStr.slice(0, 7); // "2026-03"
  return dateStr;
}

function formatGroupLabel(key: string, mode: GroupMode): string {
  if (key === "Unknown") return "Unknown Date";
  if (mode === "month") {
    const d = new Date(key + "-01");
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calcStats(picks: Pick[]) {
  const wins = picks.filter((p) => p.result === "win").length;
  const losses = picks.filter((p) => p.result === "loss").length;
  const pushes = picks.filter((p) => p.result === "push").length;
  const units = picks.reduce((sum, p) => {
    if (p.result === "win") return sum + (p.units ?? 0);
    if (p.result === "loss") return sum - (p.units ?? 0);
    return sum;
  }, 0);
  return { wins, losses, pushes, units };
}

export function PickHistory({ picks, locale, isVip }: Props) {
  const [sportFilter, setSportFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("day");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Filter
  const filtered = useMemo(() => {
    let result = picks;
    if (sportFilter !== "All") result = result.filter((p) => p.sport === sportFilter);
    if (resultFilter) result = result.filter((p) => p.result === resultFilter);
    return result;
  }, [picks, sportFilter, resultFilter]);

  // Stats (from filtered picks)
  const stats = useMemo(() => calcStats(filtered), [filtered]);

  // Group
  const groups = useMemo(() => {
    const map = new Map<string, Pick[]>();
    for (const pick of filtered) {
      const key = getDateKey(pick, groupMode);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pick);
    }
    // Sort keys descending (newest first)
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, groupMode]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const statCards = [
    { label: "Wins", value: stats.wins, color: "#22C55E", icon: Trophy },
    { label: "Losses", value: stats.losses, color: "#EF4444", icon: XCircle },
    { label: "Pushes", value: stats.pushes, color: "#F59E0B", icon: MinusCircle },
    {
      label: "Net Units",
      value: `${stats.units >= 0 ? "+" : ""}${stats.units.toFixed(1)}u`,
      color: stats.units >= 0 ? "#22C55E" : "#EF4444",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1168D9]/10">
            <History className="h-5 w-5 text-[#1168D9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1F3B]">
              Pick History
            </h1>
            <p className="text-sm text-gray-500">
              {filtered.length} settled pick{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Summary — total picks only, no W-L-P breakdown */}
      <div
        className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 animate-fade-up"
        style={{ animationDelay: "75ms" }}
      >
        <p className="text-sm text-gray-500">
          {filtered.length} settled pick{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters + Group Toggle */}
      <div className="animate-fade-up space-y-3" style={{ animationDelay: "150ms" }}>
        {/* Sport pills */}
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => setSportFilter(sport)}
              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                sportFilter === sport
                  ? "bg-[#1168D9] text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-[#1168D9]/30 hover:text-[#1168D9]"
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Result pills + group mode toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.value || "all"}
                type="button"
                onClick={() => setResultFilter(r.value)}
                className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                  resultFilter === r.value
                    ? "bg-[#0B1F3B] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-[#0B1F3B]/30 hover:text-[#0B1F3B]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Group mode toggle */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setGroupMode("day")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                groupMode === "day"
                  ? "bg-white text-[#0B1F3B] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Day
            </button>
            <button
              type="button"
              onClick={() => setGroupMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                groupMode === "month"
                  ? "bg-white text-[#0B1F3B] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Picks */}
      {filtered.length === 0 ? (
        <div className="animate-fade-up" style={{ animationDelay: "225ms" }}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <SearchX className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-[#0B1F3B]">
                No picks match your filters
              </h3>
              <p className="max-w-sm text-sm text-gray-400">
                Try adjusting the sport or result filter to see more picks.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: "225ms" }}>
          {groups.map(([key, groupPicks]) => {
            const isCollapsed = collapsedGroups.has(key);
            const groupStats = calcStats(groupPicks);

            return (
              <div
                key={key}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Group header — always visible, clickable */}
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#0B1F3B]">
                      {formatGroupLabel(key, groupMode)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {groupPicks.length} pick{groupPicks.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    />
                  </div>
                </button>

                {/* Group content */}
                {!isCollapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {groupPicks.map((pick) => {
                      const isLocked = pick.tier === "vip" && !isVip;

                      return (
                        <div key={pick.id} className="relative px-4 py-3">
                          {/* Locked VIP overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 z-10 flex items-center bg-white/90 backdrop-blur-[4px] px-4">
                              <div className="flex items-center gap-2 flex-1">
                                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                  {pick.sport}
                                </span>
                                <span className="text-xs text-gray-400">VIP Pick</span>
                              </div>
                              <span className="flex items-center gap-1 text-xs font-medium text-[#1168D9]">
                                <Crown className="h-3 w-3 text-amber-500" />
                                Upgrade to view
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            {/* Result dot */}
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  pick.result === "win"
                                    ? "#22C55E"
                                    : pick.result === "loss"
                                      ? "#EF4444"
                                      : "#F59E0B",
                              }}
                            />

                            {/* Sport badge */}
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-10 shrink-0">
                              {pick.sport}
                            </span>

                            {/* Matchup + Pick */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#0B1F3B] font-medium truncate">
                                {pick.matchup}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-mono font-semibold text-[#0B1F3B]">
                                  {pick.pickText}
                                </span>
                                {pick.odds != null && (
                                  <span className="font-mono">
                                    {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                                  </span>
                                )}
                                {pick.units != null && (
                                  <span>{pick.units}u</span>
                                )}
                              </div>
                            </div>

                            {/* Result badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                pick.result === "win"
                                  ? "bg-[#22C55E]/10 text-[#22C55E]"
                                  : pick.result === "loss"
                                    ? "bg-[#EF4444]/10 text-[#EF4444]"
                                    : "bg-[#F59E0B]/10 text-[#F59E0B]"
                              }`}
                            >
                              {pick.result?.toUpperCase()}
                            </span>

                            {/* Units +/- */}
                            <span
                              className={`font-mono text-xs font-bold shrink-0 w-14 text-right ${
                                pick.result === "win"
                                  ? "text-[#22C55E]"
                                  : pick.result === "loss"
                                    ? "text-[#EF4444]"
                                    : "text-[#F59E0B]"
                              }`}
                            >
                              {pick.result === "win"
                                ? `+${(pick.units ?? 0).toFixed(1)}`
                                : pick.result === "loss"
                                  ? `-${(pick.units ?? 0).toFixed(1)}`
                                  : "0.0"}
                              u
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
