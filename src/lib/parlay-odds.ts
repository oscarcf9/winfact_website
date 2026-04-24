/**
 * Parlay odds math.
 * Converts American odds to decimal, multiplies legs, and converts back.
 */

export function americanToDecimal(odds: number): number {
  if (odds === 0) return 1;
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * Combine American-odds legs into a single American-odds parlay price.
 * Returns null if any leg is missing odds (can't compute).
 */
export function calculateParlayOdds(legOdds: Array<number | null | undefined>): number | null {
  if (legOdds.length === 0) return null;
  let combined = 1;
  for (const o of legOdds) {
    if (o == null || o === 0) return null;
    combined *= americanToDecimal(o);
  }
  return decimalToAmerican(combined);
}

export function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}
