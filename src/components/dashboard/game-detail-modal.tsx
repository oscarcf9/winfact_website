"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  MapPin,
  Tv,
  Clock,
  Circle,
  AlertTriangle,
  Newspaper,
  ExternalLink,
  BarChart3,
} from "lucide-react";

type BookmakerOdds = {
  name: string;
  markets: Record<
    string,
    { name: string; price: number; point?: number }[]
  >;
};

type TeamDetail = {
  name: string;
  abbreviation: string;
  logo: string;
  record: string;
  homeRecord: string;
  awayRecord: string;
  score: number;
  recentForm: string[];
};

type Injury = {
  player: string;
  position: string;
  status: string;
  detail: string;
};

type GameDetail = {
  summary: {
    id: string;
    league: string;
    startTime: string;
    status: "pre" | "in" | "post";
    statusDetail: string;
    venue: string | null;
    venueCity: string | null;
    broadcast: string | null;
    homeTeam: TeamDetail;
    awayTeam: TeamDetail;
    homeInjuries: Injury[];
    awayInjuries: Injury[];
    headlines: string[];
  } | null;
  odds: {
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    bookmakers: BookmakerOdds[];
  } | null;
};

type Props = {
  league: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  onClose: () => void;
};

function formatOdds(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

function formatGameTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status, detail }: { status: string; detail: string }) {
  if (status === "in") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
        <Circle className="h-2 w-2 fill-current animate-pulse" />
        {detail}
      </span>
    );
  }
  if (status === "post") {
    return (
      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
        Final
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
      {detail || "Scheduled"}
    </span>
  );
}

function FormDot({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-500",
    L: "bg-red-500",
    D: "bg-gray-400",
    T: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white ${colors[result] || "bg-gray-300"}`}
    >
      {result}
    </span>
  );
}

function InjuryStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("out"))
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">OUT</span>;
  if (s.includes("doubtful"))
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">DOUBTFUL</span>;
  if (s.includes("questionable"))
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Q</span>;
  if (s.includes("probable") || s.includes("day-to-day"))
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">PROB</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{status}</span>;
}

// ─── Section wrappers ──────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export function GameDetailModal({ league, eventId, homeTeam, awayTeam, onClose }: Props) {
  const [data, setData] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ league, eventId, homeTeam, awayTeam });
    fetch(`/api/games/detail?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [league, eventId, homeTeam, awayTeam]);

  const summary = data?.summary;
  const odds = data?.odds;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`${awayTeam} vs ${homeTeam}`)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#0B1F3B]/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-8 animate-fade-up">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#0B1F3B] via-[#1168D9] to-[#0BC4D9]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {loading ? (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading game data...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-xs font-semibold">
                  {league}
                </span>
                {summary && <StatusBadge status={summary.status} detail={summary.statusDetail} />}
              </div>

              <div className="flex items-center justify-between">
                {/* Away team */}
                <div className="flex items-center gap-3">
                  {summary?.awayTeam.logo && (
                    <img
                      src={summary.awayTeam.logo}
                      alt={summary.awayTeam.abbreviation}
                      className="h-10 w-10 object-contain"
                    />
                  )}
                  <div>
                    <p className="text-white font-bold text-lg">{summary?.awayTeam.name || awayTeam}</p>
                    {summary?.awayTeam.record && (
                      <p className="text-white/50 text-xs">{summary.awayTeam.record}</p>
                    )}
                  </div>
                </div>

                {/* Score or VS */}
                <div className="text-center px-4">
                  {summary && summary.status !== "pre" ? (
                    <div className="flex items-center gap-3">
                      <span className="text-white text-3xl font-mono font-bold">{summary.awayTeam.score}</span>
                      <span className="text-white/40 text-sm">-</span>
                      <span className="text-white text-3xl font-mono font-bold">{summary.homeTeam.score}</span>
                    </div>
                  ) : (
                    <span className="text-white/40 text-xl font-bold">vs</span>
                  )}
                </div>

                {/* Home team */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-white font-bold text-lg">{summary?.homeTeam.name || homeTeam}</p>
                    {summary?.homeTeam.record && (
                      <p className="text-white/50 text-xs">{summary.homeTeam.record}</p>
                    )}
                  </div>
                  {summary?.homeTeam.logo && (
                    <img
                      src={summary.homeTeam.logo}
                      alt={summary.homeTeam.abbreviation}
                      className="h-10 w-10 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                {summary?.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGameTime(summary.startTime)}
                  </span>
                )}
                {summary?.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {summary.venue}
                    {summary.venueCity ? `, ${summary.venueCity}` : ""}
                  </span>
                )}
                {summary?.broadcast && (
                  <span className="flex items-center gap-1">
                    <Tv className="h-3 w-3" />
                    {summary.broadcast}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#1168D9]" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Team Records */}
            {summary && (summary.homeTeam.homeRecord || summary.awayTeam.awayRecord) && (
              <Section title="Records" icon={BarChart3}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-[#0B1F3B] mb-2">{summary.awayTeam.name}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-400">Overall</p>
                        <p className="text-sm font-mono font-semibold text-[#0B1F3B]">{summary.awayTeam.record || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Home</p>
                        <p className="text-sm font-mono text-gray-600">{summary.awayTeam.homeRecord || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Away</p>
                        <p className="text-sm font-mono text-gray-600">{summary.awayTeam.awayRecord || "—"}</p>
                      </div>
                    </div>
                    {summary.awayTeam.recentForm.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 mr-1">FORM</span>
                        {summary.awayTeam.recentForm.map((r, i) => (
                          <FormDot key={i} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-[#0B1F3B] mb-2">{summary.homeTeam.name}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-400">Overall</p>
                        <p className="text-sm font-mono font-semibold text-[#0B1F3B]">{summary.homeTeam.record || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Home</p>
                        <p className="text-sm font-mono text-gray-600">{summary.homeTeam.homeRecord || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Away</p>
                        <p className="text-sm font-mono text-gray-600">{summary.homeTeam.awayRecord || "—"}</p>
                      </div>
                    </div>
                    {summary.homeTeam.recentForm.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 mr-1">FORM</span>
                        {summary.homeTeam.recentForm.map((r, i) => (
                          <FormDot key={i} result={r} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Odds Comparison */}
            {odds && odds.bookmakers.length > 0 && (
              <Section title="Odds Comparison" icon={BarChart3}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-xs font-medium text-gray-400 w-28">Book</th>
                        <th className="text-center py-2 text-xs font-medium text-gray-400" colSpan={2}>Moneyline</th>
                        <th className="text-center py-2 text-xs font-medium text-gray-400" colSpan={2}>Spread</th>
                        <th className="text-center py-2 text-xs font-medium text-gray-400" colSpan={2}>Total</th>
                      </tr>
                      <tr className="border-b border-gray-50 text-[10px] text-gray-300">
                        <td></td>
                        <td className="text-center py-1">{odds.awayTeam.split(" ").pop()}</td>
                        <td className="text-center py-1">{odds.homeTeam.split(" ").pop()}</td>
                        <td className="text-center py-1">{odds.awayTeam.split(" ").pop()}</td>
                        <td className="text-center py-1">{odds.homeTeam.split(" ").pop()}</td>
                        <td className="text-center py-1">Over</td>
                        <td className="text-center py-1">Under</td>
                      </tr>
                    </thead>
                    <tbody>
                      {odds.bookmakers.slice(0, 8).map((bk) => {
                        const ml = bk.markets["h2h"] || [];
                        const sp = bk.markets["spreads"] || [];
                        const tot = bk.markets["totals"] || [];
                        const awayMl = ml.find((o) => o.name !== odds.homeTeam);
                        const homeMl = ml.find((o) => o.name === odds.homeTeam);
                        const awaySp = sp.find((o) => o.name !== odds.homeTeam);
                        const homeSp = sp.find((o) => o.name === odds.homeTeam);
                        const over = tot.find((o) => o.name === "Over");
                        const under = tot.find((o) => o.name === "Under");

                        return (
                          <tr key={bk.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 text-xs font-medium text-gray-600 truncate max-w-[112px]">{bk.name}</td>
                            <td className="text-center py-2 font-mono text-xs">
                              {awayMl ? formatOdds(awayMl.price) : "—"}
                            </td>
                            <td className="text-center py-2 font-mono text-xs">
                              {homeMl ? formatOdds(homeMl.price) : "—"}
                            </td>
                            <td className="text-center py-2 font-mono text-xs">
                              {awaySp ? `${awaySp.point! > 0 ? "+" : ""}${awaySp.point} (${formatOdds(awaySp.price)})` : "—"}
                            </td>
                            <td className="text-center py-2 font-mono text-xs">
                              {homeSp ? `${homeSp.point! > 0 ? "+" : ""}${homeSp.point} (${formatOdds(homeSp.price)})` : "—"}
                            </td>
                            <td className="text-center py-2 font-mono text-xs">
                              {over ? `${over.point} (${formatOdds(over.price)})` : "—"}
                            </td>
                            <td className="text-center py-2 font-mono text-xs">
                              {under ? `${under.point} (${formatOdds(under.price)})` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* Injuries */}
            {summary && (summary.homeInjuries.length > 0 || summary.awayInjuries.length > 0) && (
              <Section title="Injury Report" icon={AlertTriangle}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary.awayInjuries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">{summary.awayTeam.name}</p>
                      <div className="space-y-1.5">
                        {summary.awayInjuries.slice(0, 8).map((inj, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <InjuryStatusBadge status={inj.status} />
                            <span className="font-medium text-[#0B1F3B]">{inj.player}</span>
                            {inj.position && <span className="text-gray-400">{inj.position}</span>}
                            {inj.detail && <span className="text-gray-400 truncate">— {inj.detail}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.homeInjuries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">{summary.homeTeam.name}</p>
                      <div className="space-y-1.5">
                        {summary.homeInjuries.slice(0, 8).map((inj, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <InjuryStatusBadge status={inj.status} />
                            <span className="font-medium text-[#0B1F3B]">{inj.player}</span>
                            {inj.position && <span className="text-gray-400">{inj.position}</span>}
                            {inj.detail && <span className="text-gray-400 truncate">— {inj.detail}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Headlines */}
            {summary && summary.headlines.length > 0 && (
              <Section title="News" icon={Newspaper}>
                <ul className="space-y-2">
                  {summary.headlines.map((h, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-300 mt-1 shrink-0">•</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Google search link */}
            <div className="pt-2 border-t border-gray-100">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#1168D9] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Search for more on Google
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
