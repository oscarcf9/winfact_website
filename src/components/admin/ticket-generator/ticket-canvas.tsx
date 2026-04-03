"use client";

import { forwardRef, useMemo } from "react";
import type { BetFormData } from "./ticket-types";
import { getDisplayForSubType } from "./sport-config";
import { calculateParlayOdds } from "./payout-calculator";

// ── Icons (original assets from Flutter project) ─────────────

// ── Helpers ───────────────────────────────────────────────────

function generateTicketId(): string {
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const rest = Array.from({ length: 18 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return `${firstDigit}${rest}`;
}

function formatAmount(amountStr: string | undefined): string {
  if (!amountStr) return "$0";
  try {
    const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
    if (isNaN(amount) || amount === 0) return "$0";

    if (amount >= 1000) {
      const parts = amount.toFixed(2).split(".");
      const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts[1] === "00" ? `$${whole}` : `$${whole}.${parts[1]}`;
    }
    return amount === Math.floor(amount)
      ? `$${amount}`
      : `$${amount.toFixed(2)}`;
  } catch {
    return amountStr;
  }
}

// ── Ticket Canvas ────────────────────────────────────────────

interface TicketCanvasProps {
  data: BetFormData;
}

const TicketCanvas = forwardRef<HTMLDivElement, TicketCanvasProps>(
  function TicketCanvas({ data }, ref) {
    const ticketId = useMemo(() => generateTicketId(), []);
    const isSingle = data.betType === "Single";

    // Odds display: calculated for parlays, direct for singles
    const displayOdds = isSingle
      ? data.odds || "—"
      : (() => {
          const legOdds = data.parlayLegs.map((l) => l.odds).filter(Boolean);
          const result = calculateParlayOdds(legOdds);
          return result ? result.americanOdds : "—";
        })();

    // Bet type label for the ticket
    const betTypeDisplay = isSingle
      ? getDisplayForSubType(data.subBetType)
      : (() => {
          const names = data.parlayLegs
            .slice(0, 3)
            .map((l) => l.team1.acronym.toUpperCase())
            .filter(Boolean)
            .join(", ");
          return names || "PARLAY";
        })();

    return (
      <div
        ref={ref}
        style={{
          width: 885,
          height: 620,
          position: "relative",
          overflow: "hidden",
          borderRadius: 15,
          backgroundColor: "#05D17A",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        {/* ── Banner (0–107px) ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 107,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/admin/ticket-assets/hero4_new.png"
            alt=""
            width={885}
            height={107}
            style={{
              width: 885,
              height: 107,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* ── Main Content (starts at 157px = 107 banner + 50 gap) ── */}
        <div
          style={{
            position: "absolute",
            top: 157,
            left: 40,
            right: 40,
          }}
        >
          {/* Row: Bet Title (left) + Odds (right) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* Left: Parlay badge + title, or just title for singles */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!isSingle && (
                <div
                  style={{
                    padding: "2px 10px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    lineHeight: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "NeusaMedium, sans-serif",
                      fontSize: 25,
                      color: "#05D17A",
                    }}
                  >
                    PARLAY
                  </span>
                </div>
              )}
              <span
                style={{
                  fontFamily: isSingle
                    ? "TicketCustomFont, sans-serif"
                    : "NeusaMedium, sans-serif",
                  fontSize: 35,
                  color: "#FCFCFE",
                  fontWeight: isSingle ? 600 : 500,
                  letterSpacing: isSingle ? 0.7 : 0,
                }}
              >
                {data.betDescription || "\u00A0"}
              </span>
            </div>

            {/* Right: Odds */}
            <span
              style={{
                fontFamily: "TicketCustomFont, sans-serif",
                fontSize: 32,
                color: "#FCFCFE",
                fontWeight: 600,
                letterSpacing: 0.5,
                whiteSpace: "nowrap",
              }}
            >
              {displayOdds}
            </span>
          </div>

          {/* Bet Type Label (8px below title) */}
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontFamily: "NeusaWideMedium, sans-serif",
                fontSize: 22,
                color: "#FCFCFE",
                letterSpacing: 2.5,
                fontWeight: 600,
              }}
            >
              {betTypeDisplay}
            </span>
          </div>

          {/* Wager / Paid (40px below bet type) */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            {/* Wager column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 25,
                  color: "#FCFCFE",
                }}
              >
                Wager
              </span>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 53,
                  color: "#FCFCFE",
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {formatAmount(data.wager ? `$${data.wager}` : undefined)}
              </span>
            </div>

            {/* 280px spacer */}
            <div style={{ width: 280, flexShrink: 0 }} />

            {/* Paid column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 25,
                  color: "#FCFCFE",
                }}
              >
                Paid
              </span>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 53,
                  color: "#FCFCFE",
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {formatAmount(data.paid)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Bottom Section (absolute bottom: 32, left: 37, right: 37) ── */}
        {/* This matches Flutter: Positioned(bottom: 32, left: 37, right: 37) */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 37,
            right: 37,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Score Bar — Single bets only */}
          {isSingle && (
            <div
              style={{
                width: "100%",
                height: 85,
                backgroundColor: "#EEEDF3",
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Center: "Final Score" label */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "TicketCustomFont, sans-serif",
                    fontSize: 27,
                    fontWeight: 400,
                    color: "#41414D",
                  }}
                >
                  Final Score
                </span>
              </div>

              {/* Left: Team 1 — logo + acronym + score box */}
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 17,
                  display: "flex",
                  alignItems: "center",
                  zIndex: 1,
                }}
              >
                {data.team1.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.team1.logoDataUrl}
                    alt=""
                    style={{
                      height: 40,
                      objectFit: "contain",
                      marginRight: 10,
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "NeusaMedium, sans-serif",
                    fontSize: 35,
                    fontWeight: 600,
                    color: "#414149",
                    marginRight: 15,
                  }}
                >
                  {data.team1.acronym || "\u2014"}
                </span>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: "#DADAE4",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "TicketCustomFont, sans-serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#1A181B",
                    }}
                  >
                    {data.team1.score || "0"}
                  </span>
                </div>
              </div>

              {/* Right: Team 2 — score box + acronym + logo (mirrored) */}
              <div
                style={{
                  position: "absolute",
                  right: 20,
                  top: 17,
                  display: "flex",
                  alignItems: "center",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: "#DADAE4",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginRight: 15,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "TicketCustomFont, sans-serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#1A181B",
                    }}
                  >
                    {data.team2.score || "0"}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "NeusaMedium, sans-serif",
                    fontSize: 35,
                    fontWeight: 600,
                    color: "#414149",
                  }}
                >
                  {data.team2.acronym || "\u2014"}
                </span>
                {data.team2.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.team2.logoDataUrl}
                    alt=""
                    style={{
                      height: 40,
                      objectFit: "contain",
                      marginLeft: 10,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* 40px gap between score bar and footer */}
          <div style={{ height: 40, flexShrink: 0 }} />

          {/* Footer: ID (left) + Share (right) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Left: Ticket ID + copy icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 21,
                  fontWeight: 400,
                  color: "#FCFCFE",
                }}
              >
                ID: {ticketId}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/admin/ticket-assets/copy_icon.png"
                alt=""
                style={{ height: 30 }}
              />
            </div>

            {/* Right: Share text + icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 30,
                  fontWeight: 400,
                  color: "#FCFCFE",
                }}
              >
                Share
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/admin/ticket-assets/share.png"
                alt=""
                style={{
                  height: 38,
                  position: "relative",
                  top: -3,
                }}
              />
            </div>
          </div>

          {/* Parlay footer: divider + "Show selections" */}
          {!isSingle && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  height: 1,
                  backgroundColor: "#FFFFFF",
                  width: "100%",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 0",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "TicketCustomFont, sans-serif",
                    fontSize: 22,
                    fontWeight: 400,
                    color: "#FFFFFF",
                  }}
                >
                  Show selections
                </span>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default TicketCanvas;
