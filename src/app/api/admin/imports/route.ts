import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, picks, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/admin/imports
 * Bulk import subscribers or pick history from CSV data
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { type, rows } = await req.json();

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Missing type or rows" },
        { status: 400 }
      );
    }

    if (type === "subscribers") {
      return handleSubscriberImport(rows);
    } else if (type === "picks") {
      return handlePickImport(rows);
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

async function handleSubscriberImport(rows: Record<string, string>[]) {
  const results = { successful: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = (row.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      results.errors.push(`Row ${i + 1}: Invalid or missing email "${row.email || ""}"`);
      results.failed++;
      continue;
    }

    try {
      // Check if user already exists
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        results.skipped++;
        continue;
      }

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
      results.errors.push(`Row ${i + 1} (${email}): ${(err as Error).message}`);
      results.failed++;
    }
  }

  return NextResponse.json(results);
}

async function handlePickImport(rows: Record<string, string>[]) {
  const results = { successful: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Minimum: pick text and matchup/game
    const pickText = (row.pick || row.pick_text || row.bet || "").trim();
    const matchup = (row.game || row.matchup || row.teams || "").trim();

    if (!pickText && !matchup) {
      results.errors.push(`Row ${i + 1}: Must have at least 'pick' or 'game'`);
      results.failed++;
      continue;
    }

    try {
      const sport = normalizeSport(row.sport || row.league || "");
      const result = normalizeResult(row.result || row.outcome || "");
      const odds = parseOdds(row.odds || "");
      const units = parseFloat(row.units || "") || null;
      const confidence = normalizeConfidence(row.confidence || "");
      const tier = (row.tier || "vip").toLowerCase().includes("free") ? "free" : "vip";
      const gameDate = row.date || row.game_date || row.gameDate || null;

      await db.insert(picks).values({
        id: crypto.randomUUID(),
        sport: sport || "MLB",
        matchup: matchup || pickText,
        pickText: pickText || matchup,
        gameDate,
        odds,
        units,
        confidence: confidence as "standard" | "strong" | "top",
        tier: tier as "free" | "vip",
        status: "settled",
        result: result as "win" | "loss" | "push" | null,
        analysisEn: (row.analysis || row.notes || "").trim() || null,
        publishedAt: gameDate || new Date().toISOString(),
        settledAt: gameDate || new Date().toISOString(),
        createdAt: gameDate || new Date().toISOString(),
      });

      results.successful++;
    } catch (err) {
      results.errors.push(`Row ${i + 1}: ${(err as Error).message}`);
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
  if (s.includes("mlb") || s.includes("baseball")) return "MLB";
  if (s.includes("nfl") || s.includes("football")) return "NFL";
  if (s.includes("nba") || s.includes("basketball")) return "NBA";
  if (s.includes("nhl") || s.includes("hockey")) return "NHL";
  if (s.includes("soccer") || s.includes("futbol") || s.includes("football") || s.includes("mls") || s.includes("epl") || s.includes("liga")) return "Soccer";
  if (s.includes("ncaa") || s.includes("college")) return "NCAA";
  if (s.includes("tennis")) return "Tennis";
  return "";
}

function normalizeResult(result: string): string | null {
  const r = result.toLowerCase().trim();
  if (r === "w" || r === "win" || r === "won" || r === "✅" || r === "1") return "win";
  if (r === "l" || r === "loss" || r === "lost" || r === "❌" || r === "0") return "loss";
  if (r === "p" || r === "push" || r === "tie" || r === "draw" || r === "void") return "push";
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
