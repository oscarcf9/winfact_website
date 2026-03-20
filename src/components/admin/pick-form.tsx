"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, X, ChevronDown, Send, Radio } from "lucide-react";

const SPORTS = ["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];
const CONFIDENCE_LEVELS = ["standard", "strong", "top"];

type Pick = {
  id: string;
  sport: string;
  league?: string | null;
  matchup: string;
  pickText: string;
  odds?: number | null;
  units?: number | null;
  modelEdge?: number | null;
  confidence?: string | null;
  analysisEn?: string | null;
  analysisEs?: string | null;
  tier?: string | null;
  status?: string | null;
  result?: string | null;
  closingOdds?: number | null;
  clv?: number | null;
};

type Defaults = {
  sport?: string;
  matchup?: string;
};

type Props = {
  pick?: Pick;
  defaults?: Defaults;
};

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";

const selectClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer";

const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

export function PickForm({ pick, defaults }: Props) {
  const t = useTranslations("admin.pickForm");
  const router = useRouter();
  const isEdit = !!pick;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendOnPublish, setSendOnPublish] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(pick?.status || "draft");
  const [currentTier, setCurrentTier] = useState(pick?.tier || "vip");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      sport: form.get("sport"),
      league: form.get("league") || null,
      matchup: form.get("matchup"),
      pickText: form.get("pickText"),
      odds: Number(form.get("odds")),
      units: Number(form.get("units")),
      modelEdge: form.get("modelEdge") ? Number(form.get("modelEdge")) : null,
      confidence: form.get("confidence"),
      analysisEn: form.get("analysisEn") || null,
      analysisEs: form.get("analysisEs") || null,
      tier: form.get("tier"),
      status: form.get("status"),
    };

    if (form.get("status") === "settled" && form.get("result")) {
      data.result = form.get("result");
      data.closingOdds = form.get("closingOdds") ? Number(form.get("closingOdds")) : null;
    }

    // Include distribution flag when publishing
    if (data.status === "published" && sendOnPublish) {
      data.distribute = true;
    }

    try {
      const url = isEdit ? `/api/admin/picks/${pick.id}` : "/api/admin/picks";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t("failedToSave"));
        return;
      }

      // Auto-generate blog for new picks (not edits)
      if (!isEdit && (data.status === "published" || data.status === "draft")) {
        fetch("/api/admin/auto-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: data.sport,
            league: data.league || data.sport,
            matchup: data.matchup,
            pickText: data.pickText,
            gameDate: data.gameDate || new Date().toISOString().split("T")[0],
            odds: data.odds || null,
            units: data.units || null,
            confidence: data.confidence || null,
            tier: data.tier || "vip",
            analysisEn: data.analysisEn || null,
          }),
        }).catch(() => {
          // Blog generation is best-effort
        });
      }

      router.push("/admin/picks");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl flex items-center gap-2">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("gameDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>{t("sport")}</label>
                <select name="sport" defaultValue={pick?.sport || defaults?.sport || "MLB"} className={selectClass}>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div>
                <label className={labelClass}>{t("league")}</label>
                <input name="league" defaultValue={pick?.league || ""} className={inputClass} placeholder="e.g. American League" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("matchup")}</label>
            <input name="matchup" required defaultValue={pick?.matchup || defaults?.matchup || ""} className={inputClass} placeholder="e.g. Yankees vs Red Sox" />
          </div>

          {/* Pick Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("pickDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{t("pickText")}</label>
                <input name="pickText" required defaultValue={pick?.pickText || ""} className={inputClass} placeholder="e.g. Yankees ML" />
              </div>
              <div>
                <label className={labelClass}>{t("odds")}</label>
                <input name="odds" type="number" required defaultValue={pick?.odds || ""} className={`${inputClass} font-mono`} placeholder="-110" />
              </div>
              <div>
                <label className={labelClass}>{t("units")}</label>
                <input name="units" type="number" step="0.5" required defaultValue={pick?.units || ""} className={`${inputClass} font-mono`} placeholder="1.5" />
              </div>
            </div>
          </div>

          {/* Model & Confidence */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("modelConfidence")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{t("modelEdge")}</label>
                <input name="modelEdge" type="number" step="0.1" defaultValue={pick?.modelEdge ?? ""} className={`${inputClass} font-mono`} placeholder="3.5" />
              </div>
              <div className="relative">
                <label className={labelClass}>{t("confidence")}</label>
                <select name="confidence" defaultValue={pick?.confidence || "standard"} className={selectClass}>
                  {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <label className={labelClass}>{t("tierLabel")}</label>
                <select name="tier" defaultValue={pick?.tier || "vip"} onChange={(e) => setCurrentTier(e.target.value)} className={selectClass}>
                  <option value="free">{t("free")}</option>
                  <option value="vip">{t("vip")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("analysis")}</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t("analysisEn")}</label>
                <textarea name="analysisEn" rows={3} defaultValue={pick?.analysisEn || ""} className={`${inputClass} min-h-[80px] resize-y`} placeholder="English analysis..." />
              </div>
              <div>
                <label className={labelClass}>{t("analysisEs")}</label>
                <textarea name="analysisEs" rows={3} defaultValue={pick?.analysisEs || ""} className={`${inputClass} min-h-[80px] resize-y`} placeholder="Spanish analysis..." />
              </div>
            </div>
          </div>

          {/* Status & Result */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("statusResult")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>{t("statusLabel")}</label>
                <select name="status" defaultValue={pick?.status || "draft"} onChange={(e) => setCurrentStatus(e.target.value)} className={selectClass}>
                  <option value="draft">{t("draft")}</option>
                  <option value="published">{t("published")}</option>
                  <option value="settled">{t("settled")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <label className={labelClass}>{t("resultLabel")}</label>
                <select name="result" defaultValue={pick?.result || ""} className={selectClass}>
                  <option value="">-- None --</option>
                  <option value="win">{t("win")}</option>
                  <option value="loss">{t("loss")}</option>
                  <option value="push">{t("push")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className={labelClass}>{t("closingOdds")}</label>
              <input name="closingOdds" type="number" defaultValue={pick?.closingOdds ?? ""} className={`${inputClass} font-mono max-w-xs`} placeholder="-115" />
            </div>
          )}

          {/* Distribution */}
          {currentStatus === "published" && !(isEdit && pick?.status === "published") && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("distribution")}</h3>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                {/* Send on Publish toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-navy">{t("sendOnPublish")}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sendOnPublish}
                    onClick={() => setSendOnPublish(!sendOnPublish)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${sendOnPublish ? "bg-primary" : "bg-gray-200"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${sendOnPublish ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>

                {/* Channel indicators */}
                {sendOnPublish && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <Radio className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-gray-600">
                        {currentTier === "free" ? (
                          <p>{t("distributionFreeDesc")}</p>
                        ) : (
                          <p>{t("distributionVipDesc")}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {t("distributionNote")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {currentStatus === "published" && sendOnPublish && !(isEdit && pick?.status === "published") ? (
                <>
                  <Send className="h-4 w-4" />
                  {loading ? t("saving") : t("publishAndSend")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {loading ? t("saving") : isEdit ? t("updatePick") : t("createPick")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 cursor-pointer"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
