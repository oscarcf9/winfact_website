"use client";

import { forwardRef, useMemo } from "react";
import type { BetFormData } from "./ticket-types";
import { getDisplayForSubType } from "./sport-config";
import { calculateParlayOdds } from "./payout-calculator";

// Inline SVG icons (replacing the 467KB share.png and 6.7KB copy_icon.png)
function ShareIcon() {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FCFBF8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: "translateY(-3px)" }}
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FCFCFE"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function generateTicketId(): string {
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const rest = Array.from({ length: 18 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return `${firstDigit}${rest}`;
}

function formatAmount(amountStr: string | undefined): string {
  if (!amountStr) return "$0.00";
  try {
    const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
    if (isNaN(amount)) return amountStr;

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

interface TicketCanvasProps {
  data: BetFormData;
}

const TicketCanvas = forwardRef<HTMLDivElement, TicketCanvasProps>(
  function TicketCanvas({ data }, ref) {
    const ticketId = useMemo(() => generateTicketId(), []);
    const isSingle = data.betType === "Single";

    const displayOdds = isSingle
      ? data.odds || "-110"
      : (() => {
          const legOdds = data.parlayLegs.map((l) => l.odds).filter(Boolean);
          const result = calculateParlayOdds(legOdds);
          return result ? result.americanOdds : "+264";
        })();

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
          fontSmooth: "always",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Banner */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 107 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/admin/ticket-assets/hero4_new.png"
            alt=""
            width={885}
            height={107}
            style={{ width: 885, height: 107, objectFit: "cover", display: "block" }}
          />
        </div>

        {/* Main Content */}
        <div
          style={{
            position: "absolute",
            top: 157,
            left: 40,
            right: 40,
          }}
        >
          {/* Bet Title Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!isSingle && (
                <div
                  style={{
                    padding: "2px 10px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
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
                {data.betDescription || "Bet Description"}
              </span>
            </div>
            <span
              style={{
                fontFamily: "TicketCustomFont, sans-serif",
                fontSize: 32,
                color: "#FCFCFE",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {displayOdds}
            </span>
          </div>

          {/* Bet Type Display */}
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

          {/* Wager / Paid */}
          <div style={{ marginTop: 40, display: "flex", gap: 280 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
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
                }}
              >
                {formatAmount(data.wager ? `$${data.wager}` : undefined)}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
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
                }}
              >
                {formatAmount(data.paid)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 37,
            right: 37,
          }}
        >
          {/* Score Bar (Single bets only) */}
          {isSingle && (
            <div
              style={{
                height: 85,
                backgroundColor: "#EEEDF3",
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Center: Final Score */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "TicketCustomFont, sans-serif",
                    fontSize: 27,
                    color: "#41414D",
                  }}
                >
                  Final Score
                </span>
              </div>

              {/* Left: Team 1 */}
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 17,
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                }}
              >
                {data.team1.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.team1.logoDataUrl}
                    alt=""
                    style={{ height: 40, objectFit: "contain", marginRight: 10 }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "NeusaMedium, sans-serif",
                    fontSize: 35,
                    color: "#414149",
                    fontWeight: 600,
                    marginRight: 15,
                  }}
                >
                  {data.team1.acronym || "T1"}
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
                  }}
                >
                  <span
                    style={{
                      fontFamily: "TicketCustomFont, sans-serif",
                      fontSize: 26,
                      color: "#1A181B",
                      fontWeight: 700,
                    }}
                  >
                    {data.team1.score || "0"}
                  </span>
                </div>
              </div>

              {/* Right: Team 2 */}
              <div
                style={{
                  position: "absolute",
                  right: 20,
                  top: 17,
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
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
                    marginRight: 15,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "TicketCustomFont, sans-serif",
                      fontSize: 26,
                      color: "#1A181B",
                      fontWeight: 700,
                    }}
                  >
                    {data.team2.score || "0"}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "NeusaMedium, sans-serif",
                    fontSize: 35,
                    color: "#414149",
                    fontWeight: 600,
                  }}
                >
                  {data.team2.acronym || "T2"}
                </span>
                {data.team2.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.team2.logoDataUrl}
                    alt=""
                    style={{ height: 40, objectFit: "contain", marginLeft: 10 }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Footer: ID + Share */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 21,
                  color: "#FCFCFE",
                }}
              >
                ID: {ticketId}
              </span>
              <CopyIcon />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontFamily: "TicketCustomFont, sans-serif",
                  fontSize: 30,
                  color: "#FCFCFE",
                }}
              >
                Share
              </span>
              <ShareIcon />
            </div>
          </div>

          {/* Parlay: Show selections */}
          {!isSingle && (
            <>
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    height: 1,
                    backgroundColor: "#FFFFFF",
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
            </>
          )}
        </div>
      </div>
    );
  }
);

export default TicketCanvas;
