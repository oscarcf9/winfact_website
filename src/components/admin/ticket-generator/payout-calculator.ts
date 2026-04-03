export function parseAmericanOdds(oddsStr: string): number | null {
  const cleaned = oddsStr.trim().replace(/^\+/, "");
  const parsed = parseInt(cleaned, 10);
  if (isNaN(parsed) || parsed === 0) return null;
  return parsed;
}

export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return 1 + americanOdds / 100;
  }
  return 1 + 100 / Math.abs(americanOdds);
}

export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  }
  return Math.round(-100 / (decimalOdds - 1));
}

export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function calculateSinglePayout(
  oddsStr: string,
  wagerStr: string
): { profit: number; totalPayout: number; formatted: string } | null {
  const odds = parseAmericanOdds(oddsStr);
  if (odds === null) return null;

  const wager = parseFloat(wagerStr.replace(/[$,]/g, "").trim());
  if (isNaN(wager) || wager <= 0) return null;

  const profit =
    odds > 0 ? wager * (odds / 100) : wager * (100 / Math.abs(odds));
  const totalPayout = Math.round((wager + profit) * 100) / 100;

  return {
    profit: Math.round(profit * 100) / 100,
    totalPayout,
    formatted: formatCurrency(totalPayout),
  };
}

export function calculateParlayOdds(
  legOdds: string[]
): { americanOdds: string; decimalOdds: number } | null {
  if (legOdds.length < 2) return null;

  let combined = 1.0;
  for (const oddsStr of legOdds) {
    const odds = parseAmericanOdds(oddsStr);
    if (odds === null) return null;
    combined *= americanToDecimal(odds);
  }

  if (combined <= 1.0) return null;
  return {
    americanOdds: formatAmericanOdds(decimalToAmerican(combined)),
    decimalOdds: Math.round(combined * 10000) / 10000,
  };
}

export function calculateParlayPayout(
  legOdds: string[],
  wagerStr: string
): { profit: number; totalPayout: number; formatted: string } | null {
  const parlayOdds = calculateParlayOdds(legOdds);
  if (!parlayOdds) return null;

  const wager = parseFloat(wagerStr.replace(/[$,]/g, "").trim());
  if (isNaN(wager) || wager <= 0) return null;

  // Compute directly from decimal odds to avoid American round-trip rounding
  const totalPayout = Math.round(wager * parlayOdds.decimalOdds * 100) / 100;
  const profit = Math.round((totalPayout - wager) * 100) / 100;

  return { profit, totalPayout, formatted: formatCurrency(totalPayout) };
}

export function formatCurrency(amount: number): string {
  if (amount === Math.floor(amount) && amount < 1000) {
    return `$${amount}`;
  }
  const fixed = amount.toFixed(2);
  const [whole, decimal] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimal === "00" && amount >= 1000) {
    return `$${withCommas}`;
  }
  return `$${withCommas}.${decimal}`;
}
