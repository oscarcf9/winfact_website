"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, X, Zap, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating, confidenceToStars } from "@/components/ui/star-rating";

const SPORT_COLORS: Record<string, string> = {
  MLB: "#c8102e",
  NFL: "#013369",
  NBA: "#1d428a",
  NHL: "#000000",
  Soccer: "#326b3f",
  NCAA: "#ff6b00",
};

type PickLeg = {
  legIndex: number;
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
  result?: "win" | "loss" | "push" | "void" | null;
};

type PickCardProps = {
  pick: {
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
    stars?: number | null;
    analysisEn?: string | null;
    analysisEs?: string | null;
    tier?: "free" | "vip" | null;
    status?: "draft" | "published" | "settled" | null;
    result?: "win" | "loss" | "push" | "void" | null;
    closingOdds?: number | null;
    clv?: number | null;
    publishedAt?: string | null;
    settledAt?: string | null;
    pickType?: "single" | "parlay" | null;
    legCount?: number | null;
    legs?: PickLeg[] | null;
  };
  locale?: string;
  isVipMember?: boolean;
  showAnalysis?: boolean;
};

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type PlanInfo = {
  id: string;
  name: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
};

const FALLBACK_PLANS: PlanInfo[] = [
  {
    id: "vip_weekly",
    name: "VIP Weekly",
    price: "$45",
    period: "/week",
    features: ["All VIP picks", "Full analysis", "Real-time alerts"],
  },
  {
    id: "vip_monthly",
    name: "VIP Monthly",
    price: "$120",
    period: "/month",
    popular: true,
    features: ["All VIP picks", "Full analysis", "Real-time alerts", "Priority support"],
  },
];

const INTERVAL_MAP: Record<string, string> = {
  week: "/week",
  month: "/month",
  year: "/year",
};

// ─── Inline Upgrade Modal ────────────────────────────────────
function UpgradeModal({ onClose, locale = "en" }: { onClose: () => void; locale?: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const isEs = locale === "es";
          const paid = data
            .filter((p: { isFree?: boolean }) => !p.isFree)
            .map((p: { key: string; nameEn: string; nameEs: string; price: number; interval: string; isPopular?: boolean; featuresEn: string[]; featuresEs: string[] }) => ({
              id: p.key,
              name: isEs ? p.nameEs : p.nameEn,
              price: `$${p.price}`,
              period: INTERVAL_MAP[p.interval] || `/${p.interval}`,
              popular: p.isPopular || false,
              features: isEs ? p.featuresEs : p.featuresEn,
            }));
          if (paid.length > 0) setPlans(paid);
        }
      })
      .catch(() => {
        // keep fallback
      });
  }, [locale]);

  async function handleSubscribe(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[#0B1F3B]/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#0B1F3B] via-[#1168D9] to-[#0BC4D9]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Upgrade to VIP</h2>
          </div>
          <p className="text-sm text-white/70 mt-1">
            Unlock all picks, analysis, and premium features
          </p>
        </div>

        {/* Plans */}
        <div className="p-5 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-xl border p-4 transition-all",
                plan.popular
                  ? "border-[#1168D9]/30 bg-[#1168D9]/[0.03] ring-1 ring-[#1168D9]/10"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1168D9] text-white">
                  POPULAR
                </span>
              )}

              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#0B1F3B]">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-2xl font-bold text-[#0B1F3B]">{plan.price}</span>
                  <span className="text-xs text-gray-400">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-1.5 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="h-3 w-3 text-[#22C55E] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50",
                  plan.popular
                    ? "bg-gradient-to-r from-[#1168D9] to-[#0BC4D9] text-white hover:shadow-lg hover:shadow-[#1168D9]/20"
                    : "bg-[#0B1F3B] text-white hover:bg-[#0B1F3B]/90"
                )}
              >
                {loading === plan.id ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main PickCard ───────────────────────────────────────────
export function PickCard({ pick, locale = "en", isVipMember = true, showAnalysis = true }: PickCardProps) {
  const isLocked = pick.tier === "vip" && !isVipMember;
  const analysis = locale === "es" && pick.analysisEs ? pick.analysisEs : pick.analysisEn;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isParlay = pick.pickType === "parlay" && Array.isArray(pick.legs) && pick.legs.length >= 2;

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
          isLocked ? "border-gray-200 opacity-90" : "border-gray-200 hover:shadow-md"
        )}
      >
        {isLocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-[6px]">
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-200/50 group-hover:scale-105 transition-transform">
                <Lock className="h-6 w-6 text-amber-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#0B1F3B] flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  VIP Pick
                </p>
                <p className="text-xs font-medium text-[#1168D9] group-hover:underline">
                  Tap to upgrade
                </p>
              </div>
            </button>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge variant="sport" sportColor={SPORT_COLORS[pick.sport] || "#666"}>
              {pick.sport}
            </Badge>
            {isParlay && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1168D9]/10 text-[#1168D9]">
                <Layers className="h-3 w-3" />
                {pick.legs!.length}-LEG PARLAY
              </span>
            )}
            {(pick.stars || pick.confidence) && (
              <StarRating
                value={pick.stars ?? confidenceToStars(pick.confidence ?? null)}
                readonly
                size="sm"
              />
            )}
            {pick.tier && (
              <Badge variant="tier" tier={pick.tier}>
                {pick.tier === "vip" ? "VIP" : "Free"}
              </Badge>
            )}
            {pick.result && (
              <Badge variant="result" result={pick.result} className="ml-auto">
                {pick.result.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Matchup */}
          <h3 className="font-heading font-bold text-[#0B1F3B] text-base sm:text-lg mb-1">
            {pick.matchup}
          </h3>

          {/* Parlay legs list (renders in place of pickText for parlays) */}
          {isParlay ? (
            <>
              <ul className="mt-2 mb-3 space-y-1.5">
                {pick.legs!.map((leg) => (
                  <li
                    key={leg.legIndex}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                      {leg.legIndex + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {leg.sport}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{leg.matchup}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-semibold text-[#0B1F3B] text-sm">
                          {leg.pickText}
                        </span>
                        {leg.odds != null && (
                          <span className="font-mono text-xs text-gray-500">
                            {formatOdds(leg.odds)}
                          </span>
                        )}
                        {leg.result && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold",
                              leg.result === "win" && "bg-[#22C55E]/10 text-[#22C55E]",
                              leg.result === "loss" && "bg-[#EF4444]/10 text-[#EF4444]",
                              leg.result === "push" && "bg-[#F59E0B]/10 text-[#F59E0B]",
                              leg.result === "void" && "bg-gray-100 text-gray-500"
                            )}
                          >
                            {leg.result.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 flex-wrap border-t border-gray-100 pt-2">
                {pick.odds != null && (
                  <span className="font-mono font-semibold text-[#0B1F3B]">
                    Parlay {formatOdds(pick.odds)}
                  </span>
                )}
                {pick.units != null && <span>{pick.units}u</span>}
              </div>
            </>
          ) : (
            /* Pick details — single pick */
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
              <span className="font-mono font-semibold text-[#0B1F3B]">{pick.pickText}</span>
              {pick.odds != null && <span className="font-mono">{formatOdds(pick.odds)}</span>}
              {pick.units != null && <span>{pick.units}u</span>}
              {pick.modelEdge != null && (
                <span className="text-[#0BC4D9]">
                  {pick.modelEdge > 0 ? "+" : ""}
                  {pick.modelEdge.toFixed(1)}% edge
                </span>
              )}
            </div>
          )}

          {/* Analysis */}
          {showAnalysis && analysis && !isLocked && (
            <p className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
              {analysis}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
            {pick.publishedAt && <span>{formatDate(pick.publishedAt)}</span>}
            {pick.result && pick.clv != null && (
              <span className={cn("font-mono", pick.clv > 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
                CLV: {pick.clv > 0 ? "+" : ""}
                {pick.clv.toFixed(1)}%
              </span>
            )}
            {pick.result && pick.closingOdds != null && (
              <span className="font-mono">Close: {formatOdds(pick.closingOdds)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} locale={locale} />}
    </>
  );
}
