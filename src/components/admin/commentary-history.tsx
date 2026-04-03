"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Hash,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommentaryEntry = {
  id: string;
  gameId: string;
  sport: string;
  message: string;
  postedAt: number;
  gameState: string | null;
};

const SPORTS = ["All", "NBA", "MLB", "NFL", "NHL", "Soccer"];
const PAGE_SIZE = 25;

function sportColor(sport: string): string {
  switch (sport.toUpperCase()) {
    case "NBA":
      return "bg-orange-100 text-orange-700";
    case "MLB":
      return "bg-red-100 text-red-700";
    case "NFL":
      return "bg-green-100 text-green-700";
    case "NHL":
      return "bg-blue-100 text-blue-700";
    case "SOCCER":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });
}

function isToday(epoch: number): boolean {
  const d = new Date(epoch * 1000);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(epoch: number): boolean {
  const d = new Date(epoch * 1000);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo && d <= now;
}

function detectLanguage(message: string): "EN" | "ES" {
  const spanishIndicators = [
    " el ", " la ", " los ", " las ", " de ", " del ", " en ",
    " con ", " por ", " para ", " que ", " una ", " uno ",
  ];
  const lower = ` ${message.toLowerCase()} `;
  let hits = 0;
  for (const word of spanishIndicators) {
    if (lower.includes(word)) hits++;
  }
  return hits >= 3 ? "ES" : "EN";
}

export function CommentaryHistory() {
  const t = useTranslations("admin.commentary");

  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sport, setSport] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (sport !== "All") params.set("sport", sport);
      const res = await fetch(`/api/admin/commentary?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, sport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSportChange = (s: string) => {
    setSport(s);
    setPage(0);
  };

  const todayCount = entries.filter((e) => isToday(e.postedAt)).length;
  const weekCount = entries.filter((e) => isThisWeek(e.postedAt)).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Hash className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t("totalComments")}</p>
            <p className="text-xl font-bold text-gray-900">{total.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t("commentsToday")}</p>
            <p className="text-xl font-bold text-gray-900">{todayCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t("commentsThisWeek")}</p>
            <p className="text-xl font-bold text-gray-900">{weekCount}</p>
          </div>
        </div>
      </div>

      {/* Sport filter */}
      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => handleSportChange(s)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              sport === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {s === "All" ? t("allSports") : s}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MessageSquare className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">{t("noComments")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const lang = detectLanguage(entry.message);
              return (
                <div
                  key={entry.id}
                  className="px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Left: meta info */}
                    <div className="flex flex-col items-start gap-1.5 shrink-0 w-32">
                      <span className="text-xs text-gray-500 font-medium">
                        {formatTime(entry.postedAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                            sportColor(entry.sport)
                          )}
                        >
                          {entry.sport}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            lang === "ES"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {lang}
                        </span>
                      </div>
                    </div>

                    {/* Right: content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-mono mb-1">
                        {entry.gameId}
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                        {entry.message}
                      </p>
                      {entry.gameState && (
                        <p className="text-xs text-gray-400 mt-1">
                          State: {entry.gameState}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                page === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-white hover:shadow-sm"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
            </button>
            <span className="text-xs text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                page >= totalPages - 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-white hover:shadow-sm"
              )}
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
