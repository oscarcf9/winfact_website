import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, picks, subscriptions } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/admin/imports
 * Bulk import subscribers or pick history from CSV data.
 * Import is additive only — never updates or deletes existing records.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { type, rows, dryRun } = await req.json();

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Missing type or rows" },
        { status: 400 }
      );
    }

    if (type === "subscribers") {
      return handleSubscriberImport(rows, !!dryRun);
    } else if (type === "picks") {
      return handlePickImport(rows, !!dryRun);
    } else {
      return NextResponse.json(
        { error: "Invalid import type. Use 'subscribers' or 'picks'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriberImport(rows: Record<string, string>[], dryRun: boolean) {
  const results = {
    successful: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
    skippedRows: [] as { row: number; reason: string }[],
    dryRun,
  };

  // Validate all rows first
  const validRows: { index: number; email: string; row: Record<string, string> }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = (row.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      results.errors.push(`Row ${i + 1}: Invalid or missing email "${row.email || ""}"`);
      results.failed++;
      continue;
    }

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      results.skipped++;
      results.skippedRows.push({ row: i + 1, reason: `Email already exists: ${email}` });
      continue;
    }

    validRows.push({ index: i, email, row });
  }

  if (dryRun) {
    results.successful = validRows.length;
    return NextResponse.json(results);
  }

  // Insert all valid rows in a batch (no transaction needed for SQLite — each insert is independent)
  for (const { index, email, row } of validRows) {
    try {
      const userId = `imported_${crypto.randomUUID()}`;
      await db.insert(users).values({
        id: userId,
        email,
        name: (row.name || row.first_name || "").trim() || null,
        role: "member",
        language: (row.language || "en").trim().toLowerCase() === "es" ? "es" : "en",
        createdAt: row.joined_date || row.created_at || new Date().toISOString(),
      });

      // If subscription info provided, create subscription
      const tier = (row.plan || row.tier || row.subscription || "").trim().toLowerCase();
      if (tier && tier !== "free" && tier !== "none" && tier !== "") {
        const mappedTier = mapTier(tier);
        const status = (row.status || "active").trim().toLowerCase();
        const mappedStatus = ["active", "trialing", "past_due", "cancelled", "expired"].includes(status)
          ? status
          : "active";

        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId,
          tier: mappedTier as "free" | "vip_weekly" | "vip_monthly" | "season_pass",
          status: mappedStatus as "active" | "trialing" | "past_due" | "cancelled" | "expired",
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }

      results.successful++;
    } catch (err) {
      results.errors.push(`Row ${index + 1} (${email}): ${(err as Error).message}`);
      results.failed++;
    }
  }

  return NextResponse.json(results);
}

async function handlePickImport(rows: Record<string, string>[], dryRun: boolean) {
  const results = {
    successful: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
    skippedRows: [] as { row: number; reason: string }[],
    dryRun,
  };

  const validSports = ["NBA", "MLB", "NFL", "NHL", "Soccer", "NCAA", "Tennis"];
  const validResults = ["win", "loss", "push", "void", "w", "l", "p", "v", "won", "lost", "tie", "draw"];

  // Validate and prepare all rows first
  type PickInsert = typeof picks.$inferInsert;
  const validRows: { index: number; values: PickInsert }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Minimum: pick text or matchup/game
    const pickText = (row.pick || row.pick_text || row.bet || "").trim();
    const matchup = (row.game || row.matchup || row.teams || "").trim();

    if (!pickText && !matchup) {
      results.errors.push(`Row ${i + 1}: Must have at least 'pick' or 'game'`);
      results.failed++;
      continue;
    }

    // Validate sport if provided
    const sport = normalizeSport(row.sport || row.league || "");
    if ((row.sport || row.league || "").trim() && !sport) {
      const raw = (row.sport || row.league || "").trim();
      if (!validSports.some(s => s.toLowerCase() === raw.toLowerCase())) {
        results.errors.push(`Row ${i + 1}: Unknown sport "${raw}"`);
        results.failed++;
        continue;
      }
    }

    // Validate result if provided
    const rawResult = (row.result || row.outcome || "").trim().toLowerCase();
    if (rawResult && !validResults.includes(rawResult)) {
      results.errors.push(`Row ${i + 1}: Invalid result "${row.result}". Use win/loss/push (or w/l/p)`);
      results.failed++;
      continue;
    }
    const result = normalizeResult(row.result || row.outcome || "");

    // Validate odds if provided
    const rawOdds = (row.odds || "").trim();
    if (rawOdds && isNaN(Number(rawOdds.replace(/[^0-9.\-+]/g, "")))) {
      results.errors.push(`Row ${i + 1}: Invalid odds "${row.odds}"`);
      results.failed++;
      continue;
    }
    const odds = parseOdds(row.odds || "");

    // Validate units if provided
    const rawUnits = (row.units || "").trim();
    if (rawUnits && (isNaN(Number(rawUnits)) || Number(rawUnits) <= 0)) {
      results.errors.push(`Row ${i + 1}: Invalid units "${row.units}"`);
      results.failed++;
      continue;
    }
    const units = rawUnits ? parseFloat(rawUnits) : 1; // Default to 1

    // Validate date if provided
    let gameDate: string | null = (row.date || row.game_date || row.gameDate || "").trim() || null;
    if (gameDate) {
      const parsed = new Date(gameDate);
      if (isNaN(parsed.getTime())) {
        results.errors.push(`Row ${i + 1}: Invalid date "${gameDate}"`);
        results.failed++;
        continue;
      }
      // Normalize to ISO date string
      gameDate = parsed.toISOString().split("T")[0];
    } else {
      gameDate = new Date().toISOString().split("T")[0]; // Default to today
    }

    const confidence = normalizeConfidence(row.confidence || ""); // Default "standard"
    const tier = (row.tier || "free").toLowerCase().includes("vip") ? "vip" : "free"; // Default "free"

    // Duplicate detection: same pickText + matchup + sport + same calendar day
    const effectivePickText = pickText || matchup;
    const effectiveMatchup = matchup || pickText;
    const effectiveSport = sport || "MLB";

    const existingPicks = await db
      .select({ id: picks.id })
      .from(picks)
      .where(
        and(
          eq(picks.pickText, effectivePickText),
          eq(picks.matchup, effectiveMatchup),
          eq(picks.sport, effectiveSport),
          like(picks.gameDate, `${gameDate}%`)
        )
      )
      .limit(1);

    if (existingPicks.length > 0) {
      results.skipped++;
      results.skippedRows.push({
        row: i + 1,
        reason: `Duplicate: "${effectivePickText}" for ${effectiveMatchup} on ${gameDate}`,
      });
      continue;
    }

    const publishedAt = gameDate ? `${gameDate}T12:00:00.000Z` : new Date().toISOString();

    validRows.push({
      index: i,
      values: {
        id: crypto.randomUUID(),
        sport: effectiveSport,
        matchup: effectiveMatchup,
        pickText: effectivePickText,
        gameDate,
        odds,
        units,
        confidence: confidence as "standard" | "strong" | "top",
        tier: tier as "free" | "vip",
        status: result ? "settled" : "published",
        result: result as "win" | "loss" | "push" | null,
        analysisEn: (row.analysis || row.notes || "").trim() || null,
        publishedAt,
        settledAt: result ? publishedAt : null,
        createdAt: publishedAt,
      },
    });
  }

  if (dryRun) {
    results.successful = validRows.length;
    return NextResponse.json(results);
  }

  // Insert all valid rows — only INSERT, never UPDATE or DELETE
  for (const { index, values } of validRows) {
    try {
      await db.insert(picks).values(values);
      results.successful++;
    } catch (err) {
      results.errors.push(`Row ${index + 1}: ${(err as Error).message}`);
      results.failed++;
    }
  }

  return NextResponse.json(results);
}

function mapTier(tier: string): string {
  const t = tier.toLowerCase().replace(/[^a-z]/g, "");
  if (t.includes("weekly") || t.includes("week")) return "vip_weekly";
  if (t.includes("monthly") || t.includes("month")) return "vip_monthly";
  if (t.includes("season") || t.includes("pass")) return "season_pass";
  if (t.includes("vip")) return "vip_monthly";
  return "vip_monthly";
}

function normalizeSport(sport: string): string {
  const s = sport.toLowerCase().trim();
  if (!s) return "";
  if (s.includes("mlb") || s.includes("baseball")) return "MLB";
  if (s.includes("nfl") || s === "football") return "NFL";
  if (s.includes("nba") || s.includes("basketball")) return "NBA";
  if (s.includes("nhl") || s.includes("hockey")) return "NHL";
  if (s.includes("soccer") || s.includes("futbol") || s.includes("mls") || s.includes("epl") || s.includes("liga")) return "Soccer";
  if (s.includes("ncaa") || s.includes("college")) return "NCAA";
  if (s.includes("tennis")) return "Tennis";
  return "";
}

function normalizeResult(result: string): string | null {
  const r = result.toLowerCase().trim();
  if (!r) return null;
  if (r === "w" || r === "win" || r === "won" || r === "1") return "win";
  if (r === "l" || r === "loss" || r === "lost" || r === "0") return "loss";
  if (r === "p" || r === "push" || r === "tie" || r === "draw") return "push";
  if (r === "v" || r === "void" || r === "cancelled" || r === "postponed") return "void";
  return null;
}

function normalizeConfidence(conf: string): string {
  const c = conf.toLowerCase().trim();
  if (c === "top" || c === "best" || c === "5" || c === "high") return "top";
  if (c === "strong" || c === "good" || c === "4" || c === "medium") return "strong";
  return "standard";
}

function parseOdds(odds: string): number | null {
  const cleaned = odds.replace(/[^0-9.\-+]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
