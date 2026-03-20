"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Download,
  TrendingUp,
  Filter,
  Calendar,
} from "lucide-react";

type SettledPick = {
  id: string;
  sport: string;
  league?: string | null;
  matchup: string;
  pickText: string;
  gameDate?: string | null;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  tier?: string | null;
  result?: string | null;
  clv?: number | null;
  publishedAt?: string | null;
  settledAt?: string | null;
  createdAt?: string | null;
  capperId?: string | null;
  capperName?: string | null;
};

type Capper = {
  id: string;
  name: string;
};

type Props = {
  picks: SettledPick[];
  cappers?: Capper[];
};

const SPORT_COLORS: Record<string, string> = {
  MLB: "#ef4444",
  NFL: "#22c55e",
  NBA: "#f97316",
  NHL: "#3b82f6",
  Soccer: "#a855f7",
  NCAA: "#eab308",
};

const CHART_COLORS = {
  win: "#22c55e",
  loss: "#ef4444",
  push: "#f59e0b",
  primary: "#6366f1",
  accent: "#8b5cf6",
  grid: "#f3f4f6",
};

export function PerformanceCharts({ picks, cappers = [] }: Props) {
  const t = useTranslations("admin.analytics");
  const [sportFilter, setSportFilter] = useState("All");
  const [capperFilter, setCapperFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Get unique sports
  const sports = useMemo(
    () => ["All", ...Array.from(new Set(picks.map((p) => p.sport))).sort()],
    [picks]
  );

  // Filter picks
  const filtered = useMemo(() => {
    let result = picks;
    if (sportFilter !== "All") {
      result = result.filter((p) => p.sport === sportFilter);
    }
    if (capperFilter !== "All") {
      result = result.filter((p) => p.capperId === capperFilter);
    }
    if (dateFrom) {
      result = result.filter((p) => {
        const d = p.settledAt || p.publishedAt || p.createdAt || "";
        return d >= dateFrom;
      });
    }
    if (dateTo) {
      result = result.filter((p) => {
        const d = p.settledAt || p.publishedAt || p.createdAt || "";
        return d <= dateTo + "T23:59:59";
      });
    }
    return result;
  }, [picks, sportFilter, capperFilter, dateFrom, dateTo]);

  // ─── Monthly Performance (Line Chart) ─────────────────────
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { month: string; wins: number; losses: number; pushes: number; units: number }
    >();
    for (const p of filtered) {
      const month = (p.settledAt || p.publishedAt || p.createdAt || "").slice(0, 7);
      if (!month) continue;
      const entry = map.get(month) || { month, wins: 0, losses: 0, pushes: 0, units: 0 };
      if (p.result === "win") {
        entry.wins++;
        entry.units += p.units ?? 0;
      } else if (p.result === "loss") {
        entry.losses++;
        entry.units -= p.units ?? 0;
      } else {
        entry.pushes++;
      }
      map.set(month, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        ...m,
        winRate: m.wins + m.losses > 0 ? Math.round((m.wins / (m.wins + m.losses)) * 100) : 0,
        label: new Date(m.month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      }));
  }, [filtered]);

  // ─── Cumulative Units (Line Chart) ────────────────────────
  const cumulativeData = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = a.settledAt || a.publishedAt || a.createdAt || "";
      const db_ = b.settledAt || b.publishedAt || b.createdAt || "";
      return da.localeCompare(db_);
    });
    let cumulative = 0;
    return sorted.map((p, i) => {
      if (p.result === "win") cumulative += p.units ?? 0;
      else if (p.result === "loss") cumulative -= p.units ?? 0;
      return {
        index: i + 1,
        units: Number(cumulative.toFixed(1)),
        date: (p.settledAt || p.publishedAt || "").split("T")[0] || "",
      };
    });
  }, [filtered]);

  // ─── By Sport (Bar Chart) ────────────────────────────────
  const sportData = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; pushes: number; units: number }>();
    for (const p of filtered) {
      const entry = map.get(p.sport) || { wins: 0, losses: 0, pushes: 0, units: 0 };
      if (p.result === "win") {
        entry.wins++;
        entry.units += p.units ?? 0;
      } else if (p.result === "loss") {
        entry.losses++;
        entry.units -= p.units ?? 0;
      } else {
        entry.pushes++;
      }
      map.set(p.sport, entry);
    }
    return Array.from(map.entries())
      .map(([sport, d]) => ({
        sport,
        ...d,
        winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0,
        total: d.wins + d.losses + d.pushes,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ─── Win/Loss/Push Pie ───────────────────────────────────
  const pieData = useMemo(() => {
    const wins = filtered.filter((p) => p.result === "win").length;
    const losses = filtered.filter((p) => p.result === "loss").length;
    const pushes = filtered.filter((p) => p.result === "push").length;
    return [
      { name: t("wins"), value: wins, color: CHART_COLORS.win },
      { name: t("losses"), value: losses, color: CHART_COLORS.loss },
      { name: t("pushes"), value: pushes, color: CHART_COLORS.push },
    ].filter((d) => d.value > 0);
  }, [filtered, t]);

  // ─── By Confidence / Tier ────────────────────────────────
  const confidenceData = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; units: number }>();
    for (const p of filtered) {
      const conf = p.confidence || "standard";
      const entry = map.get(conf) || { wins: 0, losses: 0, units: 0 };
      if (p.result === "win") {
        entry.wins++;
        entry.units += p.units ?? 0;
      } else if (p.result === "loss") {
        entry.losses++;
        entry.units -= p.units ?? 0;
      }
      map.set(conf, entry);
    }
    return Array.from(map.entries()).map(([conf, d]) => ({
      confidence: conf.charAt(0).toUpperCase() + conf.slice(1),
      ...d,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0,
    }));
  }, [filtered]);

  const tierData = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; units: number }>();
    for (const p of filtered) {
      const tier = p.tier || "vip";
      const entry = map.get(tier) || { wins: 0, losses: 0, units: 0 };
      if (p.result === "win") {
        entry.wins++;
        entry.units += p.units ?? 0;
      } else if (p.result === "loss") {
        entry.losses++;
        entry.units -= p.units ?? 0;
      }
      map.set(tier, entry);
    }
    return Array.from(map.entries()).map(([tier, d]) => ({
      tier: tier.toUpperCase(),
      ...d,
      winRate: d.wins + d.losses > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0,
    }));
  }, [filtered]);

  // ─── Export ──────────────────────────────────────────────
  function handleExport() {
    const params = new URLSearchParams();
    if (sportFilter !== "All") params.set("sport", sportFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    window.open(`/api/admin/picks/export?${params.toString()}`, "_blank");
  }

  const inputClass =
    "bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div className="space-y-6">
      {/* ─── Filters Row ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          {t("filters")}:
        </div>

        {/* Sport pills */}
        <div className="flex gap-1.5 flex-wrap">
          {sports.map((s) => (
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
              {s}
            </button>
          ))}
        </div>

        {/* Capper filter */}
        {cappers.length > 0 && (
          <select
            value={capperFilter}
            onChange={(e) => setCapperFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer focus:outline-none focus:border-primary/30"
          >
            <option value="All">All Cappers</option>
            {cappers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Date range */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
            placeholder="From"
          />
          <span className="text-gray-300">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
            placeholder="To"
          />
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          {t("exportCSV")}
        </button>
      </div>

      {/* ─── Charts Grid ─── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm py-16 text-center">
          <TrendingUp className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t("noData")}</p>
        </div>
      ) : (
        <>
          {/* Row 1: Cumulative Units + Win/Loss Pie */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Cumulative Units Line */}
            <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy mb-4">{t("cumulativeUnits")}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="index"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}u`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value) => {
                      const v = Number(value ?? 0);
                      return [`${v >= 0 ? "+" : ""}${v}u`, t("units")];
                    }}
                    labelFormatter={(label) => `Pick #${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy mb-4">{t("resultBreakdown")}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Monthly Win Rate + Units Bar */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Monthly Win Rate */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy mb-4">{t("monthlyWinRate")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value) => [`${value ?? 0}%`, t("winRate")]}
                  />
                  <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.winRate >= 55 ? CHART_COLORS.win : entry.winRate >= 45 ? CHART_COLORS.push : CHART_COLORS.loss}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Units */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-navy mb-4">{t("monthlyUnits")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}u`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value) => {
                      const v = Number(value ?? 0);
                      return [`${v >= 0 ? "+" : ""}${v.toFixed(1)}u`, t("units")];
                    }}
                  />
                  <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.units >= 0 ? CHART_COLORS.win : CHART_COLORS.loss}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: By Sport Bar Chart */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-navy mb-4">{t("performanceBySport")}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sportData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  type="category"
                  dataKey="sport"
                  tick={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="wins" name={t("wins")} stackId="a" fill={CHART_COLORS.win} radius={[0, 0, 0, 0]} />
                <Bar dataKey="losses" name={t("losses")} stackId="a" fill={CHART_COLORS.loss} radius={[0, 0, 0, 0]} />
                <Bar dataKey="pushes" name={t("pushes")} stackId="a" fill={CHART_COLORS.push} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Row 4: By Confidence & Tier tables */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* By Confidence */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-navy">{t("byConfidence")}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-5 text-[10px] font-semibold text-gray-400 uppercase">{t("level")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("record")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("winRate")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("units")}</th>
                  </tr>
                </thead>
                <tbody>
                  {confidenceData.map((d) => (
                    <tr key={d.confidence} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-5 font-medium text-navy">{d.confidence}</td>
                      <td className="py-2 px-3 text-center font-mono text-gray-500">{d.wins}-{d.losses}</td>
                      <td className="py-2 px-3 text-center font-mono text-gray-500">{d.winRate}%</td>
                      <td className={`py-2 px-3 text-center font-mono font-semibold ${d.units >= 0 ? "text-success" : "text-danger"}`}>
                        {d.units >= 0 ? "+" : ""}{d.units.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Tier */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-navy">{t("byTier")}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-5 text-[10px] font-semibold text-gray-400 uppercase">{t("tier")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("record")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("winRate")}</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-400 uppercase">{t("units")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tierData.map((d) => (
                    <tr key={d.tier} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-5 font-medium text-navy">{d.tier}</td>
                      <td className="py-2 px-3 text-center font-mono text-gray-500">{d.wins}-{d.losses}</td>
                      <td className="py-2 px-3 text-center font-mono text-gray-500">{d.winRate}%</td>
                      <td className={`py-2 px-3 text-center font-mono font-semibold ${d.units >= 0 ? "text-success" : "text-danger"}`}>
                        {d.units >= 0 ? "+" : ""}{d.units.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Sport Detail Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sportData.map((s) => {
              const roi =
                s.wins + s.losses > 0
                  ? ((s.units / ((s.wins + s.losses) * (s.units / (s.wins + s.losses + s.pushes) || 1))) * 100)
                  : 0;
              const totalRisked = s.total > 0 ? (s.wins + s.losses) : 0;
              const actualRoi = totalRisked > 0 ? (s.units / totalRisked * 100) : 0;
              return (
                <div
                  key={s.sport}
                  className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SPORT_COLORS[s.sport] || "#6b7280" }}
                    />
                    <h4 className="font-semibold text-navy">{s.sport}</h4>
                    <span className="ml-auto text-xs text-gray-400">
                      {s.total} {t("picks")}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t("record")}</p>
                      <p className="font-mono font-bold text-navy">
                        {s.wins}-{s.losses}-{s.pushes}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t("winRate")}</p>
                      <p className="font-mono font-bold text-navy">{s.winRate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t("units")}</p>
                      <p
                        className={`font-mono font-bold ${
                          s.units >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {s.units >= 0 ? "+" : ""}
                        {s.units.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
