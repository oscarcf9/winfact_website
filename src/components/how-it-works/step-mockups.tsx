"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   1. DATA INGESTION — Live data stream mockup
   ────────────────────────────────────────────── */

const DATA_SOURCES = [
  { label: "ESPN", type: "Injuries", color: "text-danger" },
  { label: "Weather API", type: "Weather", color: "text-accent" },
  { label: "DraftKings", type: "Odds", color: "text-warning" },
  { label: "FanDuel", type: "Odds", color: "text-warning" },
  { label: "Pinnacle", type: "Lines", color: "text-primary" },
  { label: "Action Net.", type: "Sharp", color: "text-success" },
] as const;

export function DataFeedMockup() {
  const [activeRows, setActiveRows] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      const indices: number[] = [];
      for (let i = 0; i < count; i++) {
        indices.push(Math.floor(Math.random() * DATA_SOURCES.length));
      }
      setActiveRows(indices);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="rounded-2xl bg-[#0a1628] border border-white/10 overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1d35] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-danger/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
          <span className="ml-2 text-xs text-white/40 font-mono">data-pipeline</span>
        </div>

        {/* Data streams */}
        <div className="p-4 space-y-2">
          {DATA_SOURCES.map((source, i) => {
            const isActive = activeRows.includes(i);
            return (
              <div
                key={source.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-500",
                  isActive ? "bg-primary/15" : "bg-white/[0.02]"
                )}
              >
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-500",
                    isActive ? "bg-success animate-pulse" : "bg-white/20"
                  )}
                />
                <span className={cn("font-medium", isActive ? "text-white" : "text-white/40")}>
                  {source.label}
                </span>
                <span className={cn("ml-auto text-xs", isActive ? source.color : "text-white/20")}>
                  {source.type}
                </span>
                {isActive && (
                  <span className="text-success text-xs font-bold animate-pulse">LIVE</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Status bar */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between bg-[#0d1d35]/50">
          <span className="text-xs text-success font-mono font-medium">
            {activeRows.length} sources streaming
          </span>
          <span className="text-xs text-white/40 font-mono">20+ connected</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   2. MODEL CONSENSUS — Multi-model agreement viz
   ────────────────────────────────────────────── */

const MODEL_NAMES = ["Model A", "Model B", "Model C", "Model D"];

export function ModelConsensusMockup() {
  const [confidences, setConfidences] = useState([72, 68, 81, 75]);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 4) {
        setAgreed(false);
        setConfidences([
          55 + Math.random() * 30,
          50 + Math.random() * 35,
          60 + Math.random() * 25,
          45 + Math.random() * 40,
        ]);
      } else if (step <= 6) {
        setConfidences([
          78 + Math.random() * 5,
          80 + Math.random() * 4,
          79 + Math.random() * 5,
          81 + Math.random() * 3,
        ]);
      } else if (step === 7) {
        setConfidences([84, 86, 83, 85]);
        setAgreed(true);
      } else {
        step = 0;
      }
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const avgConfidence = (
    confidences.reduce((a, b) => a + b, 0) / confidences.length
  ).toFixed(1);

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="rounded-2xl bg-[#0a1628] border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d1d35] border-b border-white/10 flex items-center justify-between">
          <span className="text-sm text-white/70 font-mono font-medium">Consensus Engine</span>
          <span
            className={cn(
              "text-xs font-mono font-bold px-3 py-1 rounded-full transition-all duration-500",
              agreed ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            )}
          >
            {agreed ? "CONSENSUS" : "ANALYZING..."}
          </span>
        </div>

        {/* Model bars */}
        <div className="p-4 space-y-4">
          {MODEL_NAMES.map((name, i) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/60 font-mono">{name}</span>
                <span
                  className={cn(
                    "text-sm font-mono font-bold transition-colors duration-500",
                    agreed ? "text-success" : "text-primary"
                  )}
                >
                  {confidences[i].toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    agreed
                      ? "bg-gradient-to-r from-success/80 to-success"
                      : "bg-gradient-to-r from-primary/60 to-primary"
                  )}
                  style={{ width: `${confidences[i]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Consensus score */}
        <div
          className={cn(
            "px-4 py-3 border-t border-white/10 flex items-center justify-between transition-all duration-500",
            agreed ? "bg-success/5" : ""
          )}
        >
          <span className="text-sm text-white/50 font-mono">Avg Confidence</span>
          <span
            className={cn(
              "text-lg font-mono font-bold transition-colors duration-500",
              agreed ? "text-success" : "text-white/70"
            )}
          >
            {avgConfidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   3. SHARP ACTION SCAN — Line movement tracker
   ────────────────────────────────────────────── */

export function SharpActionMockup() {
  const [lines, setLines] = useState([
    { book: "Pinnacle", open: -3.0, current: -3.5, sharp: true },
    { book: "Circa", open: -3.0, current: -3.5, sharp: true },
    { book: "DraftKings", open: -3.0, current: -3.0, sharp: false },
    { book: "FanDuel", open: -3.0, current: -2.5, sharp: false },
    { book: "BetMGM", open: -3.0, current: -3.0, sharp: false },
  ]);
  const [alert, setAlert] = useState(false);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setAlert(false);
        setLines([
          { book: "Pinnacle", open: -3.0, current: -3.5, sharp: true },
          { book: "Circa", open: -3.0, current: -3.0, sharp: false },
          { book: "DraftKings", open: -3.0, current: -3.0, sharp: false },
          { book: "FanDuel", open: -3.0, current: -2.5, sharp: false },
          { book: "BetMGM", open: -3.0, current: -3.0, sharp: false },
        ]);
      } else if (step === 3) {
        setLines((prev) =>
          prev.map((l) =>
            l.book === "Circa" ? { ...l, current: -3.5, sharp: true } : l
          )
        );
      } else if (step === 5) {
        setAlert(true);
        setLines((prev) =>
          prev.map((l) =>
            l.book === "DraftKings" || l.book === "BetMGM"
              ? { ...l, current: -3.5, sharp: true }
              : l
          )
        );
      } else if (step === 8) {
        step = 0;
      }
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  const sharpCount = lines.filter((l) => l.sharp).length;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="rounded-2xl bg-[#0a1628] border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d1d35] border-b border-white/10 flex items-center justify-between">
          <span className="text-sm text-white/70 font-mono font-medium">Sharp Scanner</span>
          {alert && (
            <span className="text-xs font-mono font-bold text-warning animate-pulse px-3 py-1 bg-warning/10 rounded-full">
              STEAM MOVE
            </span>
          )}
        </div>

        {/* Game header */}
        <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <p className="text-center text-sm text-white/80 font-mono font-bold">
            NYY @ BOS — Spread
          </p>
        </div>

        {/* Book lines */}
        <div className="p-4 space-y-2">
          {lines.map((line) => {
            const moved = line.current !== line.open;
            return (
              <div
                key={line.book}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-500",
                  line.sharp ? "bg-warning/10" : "bg-white/[0.02]"
                )}
              >
                <span className="text-white/60 w-24 truncate font-medium">{line.book}</span>
                <span className="text-white/30">{line.open.toFixed(1)}</span>
                <span className="text-white/20">&rarr;</span>
                <span
                  className={cn(
                    "font-bold transition-all duration-500",
                    moved ? "text-warning" : "text-white/50"
                  )}
                >
                  {line.current.toFixed(1)}
                </span>
                {line.sharp && (
                  <span className="ml-auto text-xs text-warning font-bold">SHARP</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between bg-[#0d1d35]/50">
          <span className="text-xs text-white/40 font-mono">
            {sharpCount}/{lines.length} books moved
          </span>
          <span
            className={cn(
              "text-xs font-mono font-bold",
              sharpCount >= 3 ? "text-success" : "text-white/40"
            )}
          >
            {sharpCount >= 3 ? "EDGE CONFIRMED" : "MONITORING..."}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   4. PICK DELIVERY — Mobile app frame mockup
   ────────────────────────────────────────────── */

const MOCK_PICKS = [
  { game: "NYY @ BOS", pick: "BOS -1.5", conf: "Top", units: 2, ev: "+4.2%" },
  { game: "LAL @ GSW", pick: "Over 224.5", conf: "High", units: 1.5, ev: "+3.1%" },
  { game: "KC @ BUF", pick: "BUF +3", conf: "Med", units: 1, ev: "+2.8%" },
];

export function AppDeliveryMockup() {
  const [visiblePicks, setVisiblePicks] = useState(0);
  const [notif, setNotif] = useState(false);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setNotif(true);
        setVisiblePicks(0);
      } else if (step === 2) {
        setNotif(false);
        setVisiblePicks(1);
      } else if (step === 3) {
        setVisiblePicks(2);
      } else if (step === 4) {
        setVisiblePicks(3);
      } else if (step >= 7) {
        step = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] bg-[#0a1628] border-[3px] border-gray-600 overflow-hidden shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-10" />

        {/* Screen */}
        <div className="pt-12 pb-5 px-5">
          {/* App header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-lg font-heading font-bold text-white">
              Win<span className="text-gradient-primary">Fact</span>
            </span>
            <span className="text-xs text-white/40 font-mono">Today&apos;s Picks</span>
          </div>

          {/* Notification toast */}
          {notif && (
            <div className="mb-5 px-4 py-3 bg-primary/20 border border-primary/30 rounded-xl animate-fade-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-sm text-white font-bold">WF</span>
                </div>
                <div>
                  <p className="text-sm text-white font-semibold">New Pick Available</p>
                  <p className="text-xs text-white/50">BOS -1.5 · Top Confidence</p>
                </div>
              </div>
            </div>
          )}

          {/* Pick cards */}
          <div className="space-y-3">
            {MOCK_PICKS.map((pick, i) => (
              <div
                key={pick.game}
                className={cn(
                  "px-4 py-3 rounded-xl border transition-all duration-500",
                  i < visiblePicks
                    ? "bg-white/5 border-white/10 opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50 font-mono">{pick.game}</span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold px-2.5 py-0.5 rounded-full",
                      pick.conf === "Top"
                        ? "bg-success/20 text-success"
                        : pick.conf === "High"
                          ? "bg-primary/20 text-primary"
                          : "bg-white/10 text-white/60"
                    )}
                  >
                    {pick.conf}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base text-white font-bold">{pick.pick}</span>
                  <span className="text-sm text-success font-mono font-medium">{pick.ev}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-xs text-white/30 font-mono">{pick.units}u suggested</span>
                  <span className="text-xs text-primary font-medium">View Analysis →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-3">
          <div className="w-24 h-1.5 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
