"use client";

import { useState, useCallback, useMemo } from "react";
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
  const { ticketRef, exportToPng, isExporting } = useTicketExport();

  // Derive paid amount from current form state (no effect needed)
  const paid = useMemo(() => computePaid(formData), [formData]);
  const dataWithPaid = useMemo(
    () => ({ ...formData, paid }),
    [formData, paid]
  );

  const handleFormChange = useCallback((data: BetFormData) => {
    setFormData(data);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ticket Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate sportsbook ticket images for content creation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6 items-start">
        {/* Left: Form */}
        <div className="overflow-auto max-h-[calc(100vh-180px)] pr-1">
          <TicketForm data={dataWithPaid} onChange={handleFormChange} />
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-6 h-[calc(100vh-180px)]">
          <TicketPreview
            data={dataWithPaid}
            ticketRef={ticketRef}
            onExport={exportToPng}
            isExporting={isExporting}
          />
        </div>
      </div>
    </div>
  );
}
