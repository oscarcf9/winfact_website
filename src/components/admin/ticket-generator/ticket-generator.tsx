"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { BetFormData } from "./ticket-types";
import { INITIAL_FORM_DATA } from "./ticket-types";
import {
  calculateSinglePayout,
  calculateParlayPayout,
} from "./payout-calculator";
import { useTicketExport } from "./use-ticket-export";
import TicketForm from "./ticket-form";
import TicketPreview from "./ticket-preview";
import "./ticket-fonts.css";

interface TicketHistoryItem {
  id: string;
  imageUrl: string;
  betDescription: string;
  sport: string;
  odds: string;
  wager: string;
  paid: string;
  createdAt: string;
}

function computePaid(data: BetFormData): string {
  if (!data.wager) return "$0.00";

  if (data.betType === "Single") {
    if (data.odds) {
      const result = calculateSinglePayout(data.odds, data.wager);
      return result?.formatted ?? "$0.00";
    }
  } else {
    const legOdds = data.parlayLegs.map((l) => l.odds).filter(Boolean);
    if (legOdds.length >= 2) {
      const result = calculateParlayPayout(legOdds, data.wager);
      return result?.formatted ?? "$0.00";
    }
  }
  return "$0.00";
}

export function TicketGenerator() {
  const [formData, setFormData] = useState<BetFormData>(INITIAL_FORM_DATA);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { ticketRef, exportToPng, isExporting } = useTicketExport();

  const paid = useMemo(() => computePaid(formData), [formData]);
  const dataWithPaid = useMemo(() => ({ ...formData, paid }), [formData, paid]);

  const handleFormChange = useCallback((data: BetFormData) => {
    setFormData(data);
  }, []);

  // Load history
  useEffect(() => {
    if (activeTab === "history") {
      fetch("/api/admin/ticket-generator?limit=50")
        .then((r) => r.json())
        .then((d) => setHistory(d.tickets || []))
        .catch(() => {});
    }
  }, [activeTab]);

  // Save to history (R2 + DB)
  const saveToHistory = useCallback(async () => {
    if (!ticketRef.current || isSaving) return;
    setIsSaving(true);
    try {
      await document.fonts.ready;
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(ticketRef.current, { pixelRatio: 2, quality: 1.0, cacheBust: true });
      if (!blob) return;

      const fd = new FormData();
      fd.append("file", blob, "ticket.png");
      fd.append("data", JSON.stringify(dataWithPaid));

      const res = await fetch("/api/admin/ticket-generator", { method: "POST", body: fd });
      if (res.ok) {
        setActiveTab("history");
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        alert(err.error || "Failed to save ticket");
      }
    } finally {
      setIsSaving(false);
    }
  }, [dataWithPaid, isSaving, ticketRef]);

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Generator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate sportsbook ticket images for content creation
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "create" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Create
          </button>
          <button type="button" onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === "create" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6 items-start">
          <div className="overflow-auto max-h-[calc(100vh-180px)] pr-1">
            <TicketForm data={dataWithPaid} onChange={handleFormChange} />
          </div>
          <div className="lg:sticky lg:top-6 h-[calc(100vh-180px)]">
            <TicketPreview
              data={dataWithPaid}
              ticketRef={ticketRef}
              onExport={exportToPng}
              isExporting={isExporting}
              onSave={saveToHistory}
              isSaving={isSaving}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {history.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No tickets saved yet</p>
              <p className="text-sm mt-1">Generate and save tickets to see them here</p>
            </div>
          ) : (
            history.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.imageUrl} alt={t.betDescription || "Ticket"} className="w-full aspect-[885/620] object-cover" />
                <div className="p-3 space-y-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.betDescription || "Untitled"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t.sport?.toUpperCase()}</span>
                    <span>{t.odds}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Wager: ${t.wager}</span>
                    <span className="font-semibold text-green-600">{t.paid}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
