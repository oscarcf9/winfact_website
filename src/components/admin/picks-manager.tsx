"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Target,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  Pencil,
  Zap,
  AlertTriangle,
  ChevronDown,
  X,
  Save,
  Download,
  ListChecks,
} from "lucide-react";
import { QuickPickModal } from "@/components/admin/quick-pick-modal";

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
  confidence?: string | null;
  tier?: string | null;
  status?: string | null;
  result?: string | null;
  publishedAt?: string | null;
  settledAt?: string | null;
  createdAt?: string | null;
  analysisEn?: string | null;
};

type Tab = "active" | "settled";

type SettlementLog = {
  pickId: string;
  sport: string;
  matchup: string;
  pickText: string;
  gameFound: boolean;
  score?: string;
  result?: string;
  confidence?: string;
  reason?: string;
  autoSettled: boolean;
};

// Bulk edit: track changed results per pick
type BulkEdits = Record<string, "win" | "loss" | "push" | null>;

const SPORTS = ["All", "MLB", "NFL", "NBA", "NHL", "Soccer", "NCAA"];

const SPORT_COLORS: Record<string, string> = {
  MLB: "bg-red-100 text-red-700 border-red-200",
  NFL: "bg-green-100 text-green-700 border-green-200",
  NBA: "bg-orange-100 text-orange-700 border-orange-200",
  NHL: "bg-blue-100 text-blue-700 border-blue-200",
  Soccer: "bg-purple-100 text-purple-700 border-purple-200",
  NCAA: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Quick Edit Modal ────────────────────────────────────────
function EditPickModal({
  pick,
  onClose,
  onSaved,
}: {
  pick: Pick;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [pickText, setPickText] = useState(pick.pickText);
  const [odds, setOdds] = useState(pick.odds != null ? String(pick.odds) : "");
  const [units, setUnits] = useState(pick.units != null ? String(pick.units) : "");
  const [confidence, setConfidence] = useState(pick.confidence || "");
  const [tier, setTier] = useState(pick.tier || "vip");
  const [analysis, setAnalysis] = useState(pick.analysisEn || "");

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/picks/${pick.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: pick.sport,
          matchup: pick.matchup,
          pickText,
          odds: odds ? Number(odds) : null,
          units: units ? Number(units) : null,
          confidence: confidence || null,
          tier,
          status: pick.status,
          analysisEn: analysis || null,
        }),
      });
      onSaved();
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{pick.sport}</p>
            <p className="text-sm font-semibold text-navy">{pick.matchup}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pick</label>
            <input value={pickText} onChange={(e) => setPickText(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Odds</label>
              <input type="number" value={odds} onChange={(e) => setOdds(e.target.value)} className={`${inputClass} font-mono`} placeholder="—" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Units</label>
              <input type="number" step="0.5" value={units} onChange={(e) => setUnits(e.target.value)} className={`${inputClass} font-mono`} placeholder="—" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confidence</label>
            <div className="flex gap-1.5">
              {(["standard", "strong", "top"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfidence(confidence === c ? "" : c)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    confidence === c
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tier</label>
            <div className="flex gap-1.5">
              {(["free", "vip"] as const).map((t_) => (
                <button
                  key={t_}
                  type="button"
                  onClick={() => setTier(t_)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    tier === t_
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {t_.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Analysis</label>
            <textarea
              rows={2}
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Optional..."
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Result Picker (for bulk edit mode) ──────────────
function InlineResultPicker({
  current,
  onChange,
}: {
  current: "win" | "loss" | "push" | null;
  onChange: (val: "win" | "loss" | "push" | null) => void;
}) {
  const opts: { value: "win" | "loss" | "push"; icon: typeof CheckCircle; color: string; activeColor: string }[] = [
    { value: "win", icon: CheckCircle, color: "text-success/40", activeColor: "text-white bg-success ring-2 ring-success/30" },
    { value: "loss", icon: XCircle, color: "text-danger/40", activeColor: "text-white bg-danger ring-2 ring-danger/30" },
    { value: "push", icon: MinusCircle, color: "text-warning/40", activeColor: "text-white bg-warning ring-2 ring-warning/30" },
  ];

  return (
    <div className="flex items-center justify-center gap-0.5">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? null : o.value)}
            className={`p-1 rounded-full transition-all cursor-pointer ${active ? o.activeColor : `${o.color} hover:opacity-80`}`}
            title={o.value.charAt(0).toUpperCase() + o.value.slice(1)}
          >
            <o.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function PicksManager() {
  const t = useTranslations("admin.picks");
  const tc = useTranslations("admin.common");

  const [tab, setTab] = useState<Tab>("active");
  const [sportFilter, setSportFilter] = useState("All");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [autoSettling, setAutoSettling] = useState(false);
  const [settlementLogs, setSettlementLogs] = useState<SettlementLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [editingPick, setEditingPick] = useState<Pick | null>(null);

  // Bulk edit state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEdits, setBulkEdits] = useState<BulkEdits>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Count unsettled picks (published with no result)
  const [unsettledCount, setUnsettledCount] = useState(0);

  const fetchPicks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/picks?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setPicks(Array.isArray(data) ? data : data.picks || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Fetch unsettled count on mount
  useEffect(() => {
    async function fetchUnsettled() {
      try {
        const res = await fetch("/api/admin/picks?tab=active");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.picks || [];
          setUnsettledCount(list.length);
        }
      } catch { /* silent */ }
    }
    fetchUnsettled();
  }, []);

  useEffect(() => { fetchPicks(); }, [fetchPicks]);

  // Reset bulk edits when switching tabs
  useEffect(() => {
    setBulkMode(false);
    setBulkEdits({});
  }, [tab]);

  const filteredPicks =
    sportFilter === "All" ? picks : picks.filter((p) => p.sport === sportFilter);

  async function handleSettle(pickId: string, result: "win" | "loss" | "push") {
    setSettlingId(pickId);
    try {
      const res = await fetch(`/api/admin/picks/${pickId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled", result }),
      });
      if (res.ok) await fetchPicks();
    } catch { /* silent */ }
    finally { setSettlingId(null); }
  }

  async function handleAutoSettle() {
    setAutoSettling(true);
    try {
      const res = await fetch("/api/cron/settle-picks");
      if (res.ok) {
        const data = await res.json();
        setSettlementLogs(data.logs || []);
        setShowLogs(true);
        await fetchPicks();
      }
    } catch { /* silent */ }
    finally { setAutoSettling(false); }
  }

  // ─── Bulk Edit Handlers ─────────────────────────────────────
  function handleBulkEdit(pickId: string, result: "win" | "loss" | "push" | null) {
    setBulkEdits((prev) => {
      const next = { ...prev };
      if (result === null) {
        delete next[pickId];
      } else {
        next[pickId] = result;
      }
      return next;
    });
  }

  const bulkChangeCount = Object.keys(bulkEdits).length;

  async function handleBulkSave() {
    if (bulkChangeCount === 0) return;
    setBulkSaving(true);
    try {
      // Fire all updates in parallel
      const promises = Object.entries(bulkEdits).map(([pickId, result]) =>
        fetch(`/api/admin/picks/${pickId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "settled", result }),
        })
      );
      await Promise.all(promises);
      setBulkEdits({});
      setBulkMode(false);
      await fetchPicks();
    } catch {
      // silent
    } finally {
      setBulkSaving(false);
    }
  }

  function handleBulkCancel() {
    setBulkEdits({});
    setBulkMode(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: t("active") },
    { key: "settled", label: t("history") },
  ];

  // Use table view for history tab, card view for active
  const useTableView = tab === "settled";

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Unsettled Picks Alert */}
      {unsettledCount > 0 && tab !== "active" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">{unsettledCount} picks</span> need results.{" "}
            <button type="button" onClick={() => setTab("active")} className="text-amber-600 underline hover:text-amber-800 cursor-pointer">
              Review now
            </button>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
          <span className="text-primary">{t("title")}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">{tc("management")}</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open("/api/admin/picks/export", "_blank")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleAutoSettle}
            disabled={autoSettling}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            {autoSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Auto-Settle
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t("newPick")}
          </button>
        </div>
      </div>

      {/* Settlement Log */}
      {settlementLogs.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-navy">Settlement Log</span>
              <span className="text-xs text-gray-400">
                ({settlementLogs.filter((l) => l.autoSettled).length} settled, {settlementLogs.filter((l) => l.result === "manual_review").length} review)
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showLogs ? "rotate-180" : ""}`} />
          </button>
          {showLogs && (
            <div className="border-t border-gray-100 divide-y divide-gray-50 max-h-[250px] overflow-y-auto">
              {settlementLogs.map((log) => (
                <div key={log.pickId} className={`px-5 py-2 flex items-center gap-3 text-xs ${log.result === "manual_review" ? "bg-amber-50/50" : log.autoSettled ? "bg-success/5" : ""}`}>
                  <span className="w-12 shrink-0 font-mono text-gray-400">{log.sport}</span>
                  <span className="flex-1 min-w-0 truncate text-navy font-medium">{log.matchup}</span>
                  <span className="text-gray-500 font-mono">{log.pickText}</span>
                  {log.score && <span className="text-gray-400 font-mono">{log.score}</span>}
                  {log.autoSettled ? (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.result === "win" ? "bg-success/15 text-success" : log.result === "loss" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}>
                      {log.result?.toUpperCase()}
                    </span>
                  ) : log.result === "manual_review" ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">
                      <AlertTriangle className="h-2.5 w-2.5" /> Review
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[10px]">Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((t_) => (
            <button
              key={t_.key}
              type="button"
              onClick={() => setTab(t_.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === t_.key ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t_.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                sportFilter === s
                  ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "All" ? t("all") : s}
            </button>
          ))}
        </div>

        {/* Bulk Edit toggle - only in table view */}
        {useTableView && !loading && filteredPicks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (bulkMode) handleBulkCancel();
              else setBulkMode(true);
            }}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              bulkMode
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            {bulkMode ? "Exit Bulk Edit" : "Bulk Edit"}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : filteredPicks.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm py-16 text-center">
          <Target className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t("empty")}</p>
        </div>
      ) : useTableView ? (
        /* ─── TABLE VIEW (History + All) ─── */
        <div className={`rounded-2xl bg-white border shadow-sm overflow-hidden transition-all ${bulkMode ? "border-primary/30 ring-1 ring-primary/10" : "border-gray-200"}`}>
          {/* Bulk mode header */}
          {bulkMode && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-b border-primary/10">
              <ListChecks className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Bulk Edit Mode</span>
              <span className="text-xs text-gray-500">Click W/L/P to set results, then Save All</span>
              {bulkChangeCount > 0 && (
                <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {bulkChangeCount} changed
                </span>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sport</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Matchup</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pick</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Odds</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Units</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Result</th>
                  {!bulkMode && (
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[100px]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPicks.map((pick) => {
                  const bulkResult = bulkEdits[pick.id] ?? null;
                  const isEdited = bulkResult !== null;

                  return (
                    <tr
                      key={pick.id}
                      className={`transition-colors group ${
                        isEdited
                          ? "bg-primary/[0.03]"
                          : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="py-2 px-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {pick.gameDate || formatDate(pick.publishedAt || pick.createdAt)}
                      </td>
                      <td className="py-2 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SPORT_COLORS[pick.sport] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {pick.sport}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-navy max-w-[200px] truncate">{pick.matchup}</td>
                      <td className="py-2 px-4 font-mono text-sm text-navy font-medium">{pick.pickText}</td>
                      <td className="py-2 px-3 text-center font-mono text-xs text-gray-500">
                        {pick.odds != null ? (pick.odds > 0 ? `+${pick.odds}` : pick.odds) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-xs text-gray-500">
                        {pick.units != null ? pick.units : "—"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-bold ${pick.tier === "vip" ? "text-accent" : "text-gray-400"}`}>
                          {pick.tier === "vip" ? "VIP" : "FREE"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        {bulkMode ? (
                          /* ─── Bulk edit: always show inline W/L/P picker ─── */
                          <InlineResultPicker
                            current={bulkResult ?? (pick.result as "win" | "loss" | "push" | null)}
                            onChange={(val) => handleBulkEdit(pick.id, val)}
                          />
                        ) : pick.result ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            pick.result === "win" ? "bg-success/15 text-success" : pick.result === "loss" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                          }`}>
                            {pick.result.toUpperCase()}
                          </span>
                        ) : pick.status === "published" ? (
                          /* Inline W/L/P buttons for unsettled */
                          settlingId === pick.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin mx-auto" />
                          ) : (
                            <div className="flex items-center justify-center gap-0.5">
                              <button type="button" onClick={() => handleSettle(pick.id, "win")} title="Win"
                                className="p-1 rounded text-success/60 hover:text-success hover:bg-success/10 transition-all cursor-pointer">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => handleSettle(pick.id, "loss")} title="Loss"
                                className="p-1 rounded text-danger/60 hover:text-danger hover:bg-danger/10 transition-all cursor-pointer">
                                <XCircle className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => handleSettle(pick.id, "push")} title="Push"
                                className="p-1 rounded text-warning/60 hover:text-warning hover:bg-warning/10 transition-all cursor-pointer">
                                <MinusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {!bulkMode && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setEditingPick(pick)}
                            className="p-1 rounded text-gray-400 hover:text-accent hover:bg-accent/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title={tc("edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── CARD VIEW (Active) ─── */
        <div className="grid gap-3">
          {filteredPicks.map((pick) => (
            <div key={pick.id} className="rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-3 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                {/* Sport + meta */}
                <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SPORT_COLORS[pick.sport] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {pick.sport}
                </span>
                <span className={`text-[10px] font-bold ${pick.tier === "vip" ? "text-accent" : "text-gray-400"}`}>
                  {pick.tier === "vip" ? "VIP" : "FREE"}
                </span>

                {/* Matchup + Pick */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{pick.matchup}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-navy">{pick.pickText}</span>
                    {pick.odds != null && <span className="font-mono text-xs text-gray-400">{pick.odds > 0 ? `+${pick.odds}` : pick.odds}</span>}
                    {pick.units != null && <span className="font-mono text-xs text-gray-400">{pick.units}u</span>}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <Clock className="h-3 w-3" />
                  {pick.gameDate || formatDate(pick.publishedAt || pick.createdAt)}
                </div>

                {/* Settle buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {settlingId === pick.id ? (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <button type="button" onClick={() => handleSettle(pick.id, "win")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-all cursor-pointer">
                        <CheckCircle className="h-3 w-3" /> {t("win")}
                      </button>
                      <button type="button" onClick={() => handleSettle(pick.id, "loss")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 transition-all cursor-pointer">
                        <XCircle className="h-3 w-3" /> {t("loss")}
                      </button>
                      <button type="button" onClick={() => handleSettle(pick.id, "push")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20 transition-all cursor-pointer">
                        <MinusCircle className="h-3 w-3" /> {t("push")}
                      </button>
                    </>
                  )}
                </div>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => setEditingPick(pick)}
                  className="p-1 rounded text-gray-400 hover:text-accent hover:bg-accent/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Bulk Save Floating Bar ─── */}
      {bulkMode && bulkChangeCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-navy shadow-2xl border border-gray-700 animate-fade-up">
          <span className="text-sm text-white">
            <span className="font-bold text-primary">{bulkChangeCount}</span> pick{bulkChangeCount !== 1 ? "s" : ""} to update
          </span>
          <button
            type="button"
            onClick={handleBulkSave}
            disabled={bulkSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </button>
          <button
            type="button"
            onClick={handleBulkCancel}
            className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Quick Pick Modal */}
      <QuickPickModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={() => fetchPicks()} />

      {/* Edit Pick Modal */}
      {editingPick && (
        <EditPickModal pick={editingPick} onClose={() => setEditingPick(null)} onSaved={() => fetchPicks()} />
      )}
    </div>
  );
}
