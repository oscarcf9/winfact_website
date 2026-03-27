/**
 * Timezone utilities for WinFact Picks.
 * All date logic uses Eastern Time (America/New_York) since the operation is Miami-based.
 */

/**
 * Get current date/time in Eastern Time.
 */
export function nowET(): Date {
  const etString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(etString);
}

/**
 * Get today's date in YYYYMMDD format, in Eastern Time.
 * Used for ESPN API calls.
 */
export function todayET(): string {
  const now = nowET();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in Eastern Time.
 * Used for ISO-style date comparisons and blog enrichment.
 */
export function todayISOET(): string {
  const now = nowET();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of the current month as YYYY-MM-01 in ET.
 */
export function monthStartET(): string {
  const now = nowET();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Get the current hour in ET (0-23).
 */
export function hourET(): number {
  return nowET().getHours();
}
