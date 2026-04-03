"use client";

import { RefObject } from "react";
import type { BetFormData } from "./ticket-types";
import TicketCanvas from "./ticket-canvas";

interface TicketPreviewProps {
  data: BetFormData;
  ticketRef: RefObject<HTMLDivElement | null>;
  onExport: () => void;
  isExporting: boolean;
}

export default function TicketPreview({
  data,
  ticketRef,
  onExport,
  isExporting,
}: TicketPreviewProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="p-1.5 bg-blue-50 rounded-lg">
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">
            Ticket Preview
          </span>
          <p className="text-xs text-gray-500">Live preview of your ticket</p>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 flex flex-col items-center justify-start overflow-auto">
        <div
          style={{
            width: 885 * 0.52,
            height: 620 * 0.52,
            flexShrink: 0,
          }}
        >
          <div
            className="shadow-lg"
            style={{
              width: 885,
              height: 620,
              transform: "scale(0.52)",
              transformOrigin: "top left",
              borderRadius: 15,
              overflow: "hidden",
            }}
          >
            <TicketCanvas ref={ticketRef} data={data} />
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="w-full py-3 px-4 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download PNG
            </>
          )}
        </button>
      </div>
    </div>
  );
}
