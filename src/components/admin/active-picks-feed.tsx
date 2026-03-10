"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Target } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Pick = {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  tier?: string | null;
  publishedAt?: string | null;
};

const SPORT_DOTS: Record<string, string> = {
  MLB: "bg-red-500",
  NFL: "bg-green-600",
  NBA: "bg-orange-500",
  NHL: "bg-blue-600",
  Soccer: "bg-purple-500",
  NCAA: "bg-yellow-600",
};

export function ActivePicksFeed() {
  const t = useTranslations("admin.dashboard");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/picks?tab=active");
        if (res.ok) {
          const data = await res.json();
          setPicks(Array.isArray(data) ? data : data.picks || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-bold text-base text-navy">{t("activePicks")}</h2>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {picks.length}
          </span>
        </div>
        <Link
          href="/admin/picks"
          className="text-xs text-gray-400 hover:text-primary transition-colors"
        >
          {t("viewAll")} →
        </Link>
      </div>

      {picks.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-400 text-sm">{t("noActivePicks")}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {picks.map((pick) => (
            <div key={pick.id} className="px-5 py-3 flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${SPORT_DOTS[pick.sport] || "bg-gray-400"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 uppercase font-semibold">{pick.sport}</span>
                  {pick.tier === "vip" && (
                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">VIP</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{pick.matchup}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-mono font-semibold text-navy">{pick.pickText}</p>
                {pick.odds != null && (
                  <p className="text-xs font-mono text-gray-400">
                    {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                    {pick.units != null && ` / ${pick.units}u`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
