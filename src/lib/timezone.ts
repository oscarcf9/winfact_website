/**
 * Timezone utilities for WinFact Picks.
 * All date logic uses Eastern Time (America/New_York) since the operation is Miami-based.
 */

/**
 * Get current date/time in Eastern Time.
 * Uses Intl.DateTimeFormat to correctly extract ET components
 * regardless of the server's local timezone (Vercel runs in UTC).
 */
export function nowET(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";

  // Build a date from the ET components directly, using UTC constructor
  // so the resulting Date object represents the correct ET wall-clock time
  return new Date(
    Date.UTC(
      parseInt(get("year")),
      parseInt(get("month")) - 1,
      parseInt(get("day")),
      parseInt(get("hour")),
      parseInt(get("minute")),
      parseInt(get("second"))
    )
  );
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
 * Get the current hour in ET (0-23). Robust against the host process
 * timezone: nowET() returns a Date whose UTC fields encode ET wall-clock,
 * so getUTCHours() reads the ET hour regardless of where the process runs.
 * Using getHours() here was incorrect on non-UTC dev machines.
 */
export function hourET(): number {
  return nowET().getUTCHours();
}
