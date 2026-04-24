import { db } from "@/db";
import { picks, parlayLegs } from "@/db/schema";
import { eq, desc, and, gte, inArray, asc } from "drizzle-orm";

type PickRow = typeof picks.$inferSelect;
type LegRow = typeof parlayLegs.$inferSelect;
export type PickWithLegs = PickRow & { legs?: LegRow[] };

/**
 * Enrich a list of picks with their parlay legs (for pickType='parlay' only).
 * Single query by pick IDs, then grouped and attached.
 */
export async function attachParlayLegs<T extends PickRow>(
  rows: T[]
): Promise<(T & { legs?: LegRow[] })[]> {
  const parlayIds = rows.filter((r) => r.pickType === "parlay").map((r) => r.id);
  if (parlayIds.length === 0) return rows.map((r) => ({ ...r }));
  const legs = await db
    .select()
    .from(parlayLegs)
    .where(inArray(parlayLegs.pickId, parlayIds))
    .orderBy(asc(parlayLegs.legIndex));
  const byPick = new Map<string, LegRow[]>();
  for (const leg of legs) {
    if (!byPick.has(leg.pickId)) byPick.set(leg.pickId, []);
    byPick.get(leg.pickId)!.push(leg);
  }
  return rows.map((r) => ({
    ...r,
    ...(r.pickType === "parlay" ? { legs: byPick.get(r.id) || [] } : {}),
  }));
}

export async function getPublishedPicks(options?: {
  sport?: string;
  tier?: "free" | "vip";
  limit?: number;
}): Promise<PickWithLegs[]> {
  const conditions = [eq(picks.status, "published")];

  if (options?.sport) {
    conditions.push(eq(picks.sport, options.sport));
  }
  if (options?.tier) {
    conditions.push(eq(picks.tier, options.tier));
  }

  const rows = await db
    .select()
    .from(picks)
    .where(and(...conditions))
    .orderBy(desc(picks.publishedAt))
    .limit(options?.limit ?? 50);
  return attachParlayLegs(rows);
}

export async function getSettledPicks(options?: {
  sport?: string;
  limit?: number;
}): Promise<PickWithLegs[]> {
  const conditions = [eq(picks.status, "settled")];

  if (options?.sport) {
    conditions.push(eq(picks.sport, options.sport));
  }

  const rows = await db
    .select()
    .from(picks)
    .where(and(...conditions))
    .orderBy(desc(picks.settledAt))
    .limit(options?.limit ?? 100);
  return attachParlayLegs(rows);
}

export async function getPickById(id: string) {
  const result = await db
    .select()
    .from(picks)
    .where(eq(picks.id, id))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Get date/time components for a given timezone using Intl (reliable across all environments).
 */
function getDatePartsInTZ(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"), // Intl may return 24 for midnight
  };
}

/**
 * Calculate the start of the current visibility window based on 4 AM ET.
 * If the current time is before 4 AM ET, the window started at 4 AM ET yesterday.
 * If the current time is at or after 4 AM ET, the window started at 4 AM ET today.
 *
 * Returns an ISO 8601 UTC string suitable for database comparison.
 */
function getWindowStart(): string {
  const now = new Date();

  // Get current time in both ET and UTC to determine the ET→UTC offset
  const et = getDatePartsInTZ(now, "America/New_York");
  const utc = getDatePartsInTZ(now, "UTC");

  // Calculate ET→UTC offset in hours by comparing the hour component.
  // ET is always behind UTC, so offset is positive (4 for EDT, 5 for EST).
  // We use the full date difference to handle day boundaries correctly.
  const nowUTCMs = Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour);
  const nowETAsUTCMs = Date.UTC(et.year, et.month - 1, et.day, et.hour);
  const offsetHours = (nowUTCMs - nowETAsUTCMs) / (1000 * 60 * 60);

  // Determine the window start date in ET
  let windowYear = et.year;
  let windowMonth = et.month;
  let windowDay = et.day;

  if (et.hour < 4) {
    // Before 4 AM ET, so the window started yesterday at 4 AM ET
    const yesterday = new Date(Date.UTC(et.year, et.month - 1, et.day - 1));
    windowYear = yesterday.getUTCFullYear();
    windowMonth = yesterday.getUTCMonth() + 1;
    windowDay = yesterday.getUTCDate();
  }

  // 4 AM ET → UTC: add the offset hours
  const windowStartUTC = new Date(
    Date.UTC(windowYear, windowMonth - 1, windowDay, 4 + offsetHours, 0, 0)
  );

  return windowStartUTC.toISOString();
}

export async function getTodayPicks(): Promise<PickWithLegs[]> {
  const windowStart = getWindowStart();
  const rows = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.status, "published"),
        gte(picks.publishedAt, windowStart)
      )
    )
    .orderBy(desc(picks.publishedAt));
  return attachParlayLegs(rows);
}

export async function getActivePicks(): Promise<PickWithLegs[]> {
  const windowStart = getWindowStart();
  const rows = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.status, "published"),
        gte(picks.publishedAt, windowStart)
      )
    )
    .orderBy(desc(picks.publishedAt));
  return attachParlayLegs(rows);
}

export async function getRecentSettledBySport(
  sport: string,
  limit = 5
): Promise<PickWithLegs[]> {
  const rows = await db
    .select()
    .from(picks)
    .where(and(eq(picks.status, "settled"), eq(picks.sport, sport)))
    .orderBy(desc(picks.settledAt))
    .limit(limit);
  return attachParlayLegs(rows);
}
