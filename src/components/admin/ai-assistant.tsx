"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Brain,
  Target,
  FileText,
  BarChart3,
  AlertTriangle,
  Sparkles,
  Copy,
  Loader2,
  Check,
  ChevronDown,
  Info,
} from "lucide-react";

const TABS = [
  { id: "analysis", icon: Target },
  { id: "blog", icon: FileText },
  { id: "recap", icon: BarChart3 },
  { id: "injury", icon: AlertTriangle },
];

const SPORTS = ["MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];

const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";
const selectClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 appearance-none cursor-pointer";
const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

type Prefill = {
  sport?: string;
  matchup?: string;
  odds?: string;
  modelEdge?: string;
  sharpAction?: string;
  injuries?: string;
  lineHistory?: string;
};

type Props = {
  initialTab?: string;
  prefill?: Prefill;
};

export function AIAssistant({ initialTab, prefill }: Props) {
  const t = useTranslations("admin.ai");
  const [activeTab, setActiveTab] = useState(initialTab || "analysis");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState("");
  const autoTriggered = useRef(false);

  // Auto-trigger analysis when prefilled from Intelligence module
  useEffect(() => {
    if (prefill?.matchup && activeTab === "analysis" && !autoTriggered.current) {
      autoTriggered.current = true;
      // Auto-submit after a short delay to let the form render
      const timer = setTimeout(() => {
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [prefill, activeTab]);

  const tabLabels: Record<string, string> = {
    analysis: t("pickAnalysis"),
    blog: t("blogWriter"),
    recap: t("weeklyRecap"),
    injury: t("injuryImpact"),
  };

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  async function handleAnalysis(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: form.get("sport"),
          matchup: form.get("matchup"),
          odds: form.get("odds") ? Number(form.get("odds")) : undefined,
          modelEdge: form.get("modelEdge") ? Number(form.get("modelEdge")) : undefined,
          injuries: form.get("injuries") || undefined,
          lineHistory: form.get("lineHistory") || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setResult({ en: data.en, es: data.es });
      else setResult({ error: data.error || "Failed to generate" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleBlog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/ai/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.get("topic"),
          sport: form.get("sport"),
          keywords: (form.get("keywords") as string)?.split(",").map((k) => k.trim()).filter(Boolean) || [],
        }),
      });
      const data = await res.json();
      if (res.ok) setResult({ titleEn: data.titleEn, titleEs: data.titleEs, bodyEn: data.bodyEn, bodyEs: data.bodyEs });
      else setResult({ error: data.error || "Failed to generate" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRecap() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ai/recap", { method: "POST" });
      const data = await res.json();
      if (res.ok) setResult({ en: data.en, es: data.es });
      else setResult({ error: data.error || "Failed to generate" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleInjury(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: form.get("sport"),
          matchup: form.get("matchup"),
          injuries: form.get("injuryReport"),
        }),
      });
      const data = await res.json();
      if (res.ok) setResult({ en: data.en, es: data.es });
      else setResult({ error: data.error || "Failed to generate" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const outputLabels: Record<string, string> = {
    en: t("english"),
    es: t("spanish"),
    titleEn: t("titleEn"),
    titleEs: t("titleEs"),
    bodyEn: t("bodyEn"),
    bodyEs: t("bodyEs"),
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
            <span className="text-primary">{t("title")}</span>
            <span className="text-gray-400 text-lg font-normal ml-3">{t("subtitle")}</span>
          </h1>
          <p className="text-xs text-gray-400">{t("poweredBy")}</p>
        </div>
      </div>

      {/* Prefill Banner */}
      {prefill?.matchup && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
          <Info className="h-4 w-4 shrink-0" />
          Pre-filled from Intelligence Module: <strong>{prefill.matchup}</strong>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tabLabels[tab.id]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-bold text-lg text-navy">{t("input")}</h2>
          </div>
          <div className="p-6">
            {activeTab === "analysis" && (
              <form onSubmit={handleAnalysis} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className={labelClass}>{t("sport")}</label>
                    <select name="sport" defaultValue={prefill?.sport || "MLB"} className={selectClass}>
                      {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div>
                    <label className={labelClass}>{t("odds")}</label>
                    <input name="odds" type="number" defaultValue={prefill?.odds || ""} className={`${inputClass} font-mono`} placeholder="-110" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("matchup")}</label>
                  <input name="matchup" required defaultValue={prefill?.matchup || ""} className={inputClass} placeholder="Lakers vs Celtics" />
                </div>
                <div>
                  <label className={labelClass}>{t("modelEdge")}</label>
                  <input name="modelEdge" type="number" step="0.1" defaultValue={prefill?.modelEdge || ""} className={`${inputClass} font-mono`} placeholder="3.5" />
                </div>
                <div>
                  <label className={labelClass}>{t("injuries")}</label>
                  <textarea name="injuries" rows={2} defaultValue={prefill?.injuries || ""} className={`${inputClass} resize-y`} placeholder="Key injuries..." />
                </div>
                <div>
                  <label className={labelClass}>{t("lineHistory")}</label>
                  <input name="lineHistory" defaultValue={prefill?.lineHistory || ""} className={inputClass} placeholder="Opened -3, now -4.5" />
                </div>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("generating") : t("generateAnalysis")}
                </button>
              </form>
            )}

            {activeTab === "blog" && (
              <form onSubmit={handleBlog} className="space-y-4">
                <div>
                  <label className={labelClass}>{t("topic")}</label>
                  <input name="topic" required className={inputClass} placeholder="NBA Playoffs Round 1 Preview" />
                </div>
                <div className="relative">
                  <label className={labelClass}>{t("sport")}</label>
                  <select name="sport" className={selectClass}>
                    {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <div>
                  <label className={labelClass}>{t("keywords")}</label>
                  <input name="keywords" className={inputClass} placeholder="NBA picks, playoff betting, spread analysis" />
                </div>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("writing") : t("generateBlog")}
                </button>
              </form>
            )}

            {activeTab === "recap" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{t("recapDescription")}</p>
                <button onClick={handleRecap} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("generating") : t("generateRecap")}
                </button>
              </div>
            )}

            {activeTab === "injury" && (
              <form onSubmit={handleInjury} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className={labelClass}>{t("sport")}</label>
                    <select name="sport" className={selectClass}>
                      {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div>
                    <label className={labelClass}>{t("matchup")}</label>
                    <input name="matchup" required className={inputClass} placeholder="Lakers vs Celtics" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("injuryReport")}</label>
                  <textarea name="injuryReport" required rows={4} className={`${inputClass} resize-y`} placeholder={"LeBron James (ankle) - Questionable\nAnthony Davis (knee) - Probable"} />
                </div>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("analyzing") : t("analyzeImpact")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-bold text-lg text-navy">{t("output")}</h2>
          </div>
          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-sm text-gray-400">{t("aiThinking")}</p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-gray-200 mb-4" />
                <p className="text-sm text-gray-400">{t("resultsHere")}</p>
              </div>
            )}

            {!loading && result?.error && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                {result.error}
              </div>
            )}

            {!loading && result && !result.error && (
              <div className="space-y-4">
                {Object.entries(result).map(([key, value]) => {
                  if (!value) return null;
                  const label = outputLabels[key] || key;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                        <button
                          onClick={() => copyText(key, value)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer"
                        >
                          {copied === key ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                          {copied === key ? t("copied") : t("copy")}
                        </button>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
