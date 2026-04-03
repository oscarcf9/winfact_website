/**
 * Payout Calculator — TypeScript Port
 *
 * Ported from Flutter: lib/providers/bet_data_provider.dart
 * Handles American odds → payout calculation for single bets and parlays.
 *
 * American Odds Reference:
 *   - Negative odds (e.g., -150): Bet $150 to win $100 profit
 *   - Positive odds (e.g., +200): Bet $100 to win $200 profit
 *   - The "Paid" amount = wager + profit (total return)
 */

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export interface PayoutResult {
  /** The profit portion (excluding original wager) */
  profit: number;
  /** Total payout (wager + profit) */
  totalPayout: number;
  /** Formatted as "$X,XXX.XX" */
  formattedPayout: string;
}

export interface ParlayOddsResult {
  /** Combined American odds string (e.g., "+264") */
  americanOdds: string;
  /** Combined decimal odds (e.g., 3.644) */
  decimalOdds: number;
}

// ────────────────────────────────────────
// Core Functions
// ────────────────────────────────────────

/**
 * Parse an American odds string into a number.
 * Handles "+120", "-145", "110", etc.
 * Returns null if the string is not valid odds.
 */
export function parseAmericanOdds(oddsStr: string): number | null {
  const cleaned = oddsStr.trim().replace(/^\+/, "");
  const parsed = parseInt(cleaned, 10);
  if (isNaN(parsed) || parsed === 0) return null;
  return parsed;
}

/**
 * Convert American odds to decimal odds.
 *
 * - Positive (+200): decimal = 1 + (odds / 100) = 3.0
 * - Negative (-150): decimal = 1 + (100 / |odds|) = 1.667
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return 1 + americanOdds / 100;
  } else {
    return 1 + 100 / Math.abs(americanOdds);
  }
}

/**
 * Convert decimal odds back to American odds.
 *
 * - decimal >= 2.0: american = (decimal - 1) * 100 (positive)
 * - decimal < 2.0: american = -100 / (decimal - 1) (negative)
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
}

/**
 * Format American odds with +/- prefix.
 */
export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Calculate payout for a single bet.
 *
 * @param oddsStr - American odds string (e.g., "-145", "+120")
 * @param wagerStr - Wager amount string (e.g., "50", "$50.00", "50.00")
 * @returns PayoutResult or null if inputs are invalid
 *
 * Formula:
 *   Positive odds: profit = wager × (odds / 100)
 *   Negative odds: profit = wager × (100 / |odds|)
 *   Total payout = wager + profit
 */
export function calculateSinglePayout(
  oddsStr: string,
  wagerStr: string
): PayoutResult | null {
  const odds = parseAmericanOdds(oddsStr);
  if (odds === null) return null;

  const wager = parseWager(wagerStr);
  if (wager === null || wager <= 0) return null;

  let profit: number;
  if (odds > 0) {
    profit = wager * (odds / 100);
  } else {
    profit = wager * (100 / Math.abs(odds));
  }

  const totalPayout = Math.round((wager + profit) * 100) / 100;
  profit = Math.round(profit * 100) / 100;

  return {
    profit,
    totalPayout,
    formattedPayout: formatCurrency(totalPayout),
  };
}

/**
 * Calculate combined parlay odds from individual leg odds.
 *
 * Method: Convert each leg to decimal, multiply together, convert back.
 *
 * @param legOdds - Array of American odds strings, one per leg
 * @returns Combined odds result, or null if any leg is invalid
 *
 * Example: 2-leg parlay with -110 and -110
 *   Leg 1 decimal: 1 + (100/110) = 1.9091
 *   Leg 2 decimal: 1 + (100/110) = 1.9091
 *   Combined: 1.9091 × 1.9091 = 3.6446
 *   American: (3.6446 - 1) × 100 = +264
 */
export function calculateParlayOdds(legOdds: string[]): ParlayOddsResult | null {
  if (legOdds.length < 2) return null;

  let combinedDecimal = 1.0;

  for (const oddsStr of legOdds) {
    const odds = parseAmericanOdds(oddsStr);
    if (odds === null) return null;
    combinedDecimal *= americanToDecimal(odds);
  }

  if (combinedDecimal <= 1.0) return null;

  const americanOdds = decimalToAmerican(combinedDecimal);

  return {
    americanOdds: formatAmericanOdds(americanOdds),
    decimalOdds: Math.round(combinedDecimal * 10000) / 10000,
  };
}

/**
 * Calculate full parlay payout (combined odds + wager).
 *
 * @param legOdds - Array of American odds strings
 * @param wagerStr - Wager amount
 * @returns PayoutResult or null
 */
export function calculateParlayPayout(
  legOdds: string[],
  wagerStr: string
): PayoutResult | null {
  const parlayOdds = calculateParlayOdds(legOdds);
  if (!parlayOdds) return null;

  return calculateSinglePayout(parlayOdds.americanOdds, wagerStr);
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

/**
 * Parse a wager string to a number.
 * Handles "$50", "50.00", "$1,500.00", "50", etc.
 */
function parseWager(wagerStr: string): number | null {
  const cleaned = wagerStr.replace(/[$,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;
  return parsed;
}

/**
 * Format a number as currency with commas.
 * Examples: 50 → "$50", 1500.50 → "$1,500.50", 84.48 → "$84.48"
 */
export function formatCurrency(amount: number): string {
  if (amount === Math.floor(amount) && amount < 1000) {
    return `$${amount}`;
  }

  const fixed = amount.toFixed(2);
  const [whole, decimal] = fixed.split(".");

  // Add commas to whole part
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Drop ".00" for clean whole numbers >= 1000
  if (decimal === "00" && amount >= 1000) {
    return `$${withCommas}`;
  }

  return `$${withCommas}.${decimal}`;
}

// ────────────────────────────────────────
// Unit Tests
// ────────────────────────────────────────

if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
  console.log("Running payout calculator tests...\n");

  const tests: Array<{
    name: string;
    fn: () => boolean;
  }> = [
    // ── parseAmericanOdds ──
    {
      name: "parseAmericanOdds: positive odds",
      fn: () => parseAmericanOdds("+200") === 200,
    },
    {
      name: "parseAmericanOdds: negative odds",
      fn: () => parseAmericanOdds("-150") === -150,
    },
    {
      name: "parseAmericanOdds: no prefix",
      fn: () => parseAmericanOdds("110") === 110,
    },
    {
      name: "parseAmericanOdds: zero returns null",
      fn: () => parseAmericanOdds("0") === null,
    },
    {
      name: "parseAmericanOdds: invalid returns null",
      fn: () => parseAmericanOdds("abc") === null,
    },

    // ── americanToDecimal ──
    {
      name: "americanToDecimal: +200 → 3.0",
      fn: () => americanToDecimal(200) === 3.0,
    },
    {
      name: "americanToDecimal: -150 → 1.667",
      fn: () => Math.abs(americanToDecimal(-150) - 1.6667) < 0.001,
    },
    {
      name: "americanToDecimal: +100 (even) → 2.0",
      fn: () => americanToDecimal(100) === 2.0,
    },
    {
      name: "americanToDecimal: -100 → 2.0",
      fn: () => americanToDecimal(-100) === 2.0,
    },

    // ── calculateSinglePayout ──
    {
      name: "single payout: $100 at -150 → $166.67",
      fn: () => {
        const r = calculateSinglePayout("-150", "100");
        return r !== null && r.totalPayout === 166.67;
      },
    },
    {
      name: "single payout: $100 at +200 → $300",
      fn: () => {
        const r = calculateSinglePayout("+200", "100");
        return r !== null && r.totalPayout === 300;
      },
    },
    {
      name: "single payout: $50 at -110 → $95.45",
      fn: () => {
        const r = calculateSinglePayout("-110", "50");
        return r !== null && r.totalPayout === 95.45;
      },
    },
    {
      name: "single payout: $100 at +100 (even) → $200",
      fn: () => {
        const r = calculateSinglePayout("+100", "100");
        return r !== null && r.totalPayout === 200;
      },
    },
    {
      name: "single payout: $1000 at -200 → $1500",
      fn: () => {
        const r = calculateSinglePayout("-200", "$1,000");
        return r !== null && r.totalPayout === 1500;
      },
    },
    {
      name: "single payout: invalid odds → null",
      fn: () => calculateSinglePayout("abc", "100") === null,
    },
    {
      name: "single payout: zero wager → null",
      fn: () => calculateSinglePayout("-110", "0") === null,
    },

    // ── calculateParlayOdds ──
    {
      name: "parlay odds: -110 + -110 → +264",
      fn: () => {
        const r = calculateParlayOdds(["-110", "-110"]);
        return r !== null && r.americanOdds === "+264";
      },
    },
    {
      name: "parlay odds: +150 + +200 → +1150 (approx)",
      fn: () => {
        // 2.5 * 3.0 = 7.5 → (7.5-1)*100 = +650
        const r = calculateParlayOdds(["+150", "+200"]);
        return r !== null && r.americanOdds === "+650";
      },
    },
    {
      name: "parlay odds: 3-leg -110 each → ~+596",
      fn: () => {
        const r = calculateParlayOdds(["-110", "-110", "-110"]);
        // 1.9091^3 = 6.9615 → (6.9615-1)*100 = +596
        return r !== null && parseInt(r.americanOdds.replace("+", "")) >= 594;
      },
    },
    {
      name: "parlay odds: single leg → null",
      fn: () => calculateParlayOdds(["-110"]) === null,
    },

    // ── calculateParlayPayout ──
    {
      name: "parlay payout: $100 on -110/-110 → ~$364",
      fn: () => {
        const r = calculateParlayPayout(["-110", "-110"], "100");
        return r !== null && r.totalPayout >= 363 && r.totalPayout <= 365;
      },
    },

    // ── formatCurrency ──
    {
      name: "formatCurrency: 50 → $50",
      fn: () => formatCurrency(50) === "$50",
    },
    {
      name: "formatCurrency: 84.48 → $84.48",
      fn: () => formatCurrency(84.48) === "$84.48",
    },
    {
      name: "formatCurrency: 1500 → $1,500",
      fn: () => formatCurrency(1500) === "$1,500",
    },
    {
      name: "formatCurrency: 1500.50 → $1,500.50",
      fn: () => formatCurrency(1500.5) === "$1,500.50",
    },
    {
      name: "formatCurrency: 10000 → $10,000",
      fn: () => formatCurrency(10000) === "$10,000",
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (test.fn()) {
        console.log(`  PASS  ${test.name}`);
        passed++;
      } else {
        console.log(`  FAIL  ${test.name}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ERR   ${test.name}: ${e}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${tests.length} tests`);
  if (failed > 0) process.exit(1);
}
