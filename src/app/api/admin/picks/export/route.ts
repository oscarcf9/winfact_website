import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build filters
    const conditions = [eq(picks.status, "settled")];
    if (sport && sport !== "All") {
      conditions.push(eq(picks.sport, sport));
    }
    if (from) {
      conditions.push(gte(picks.settledAt, from));
    }
    if (to) {
      conditions.push(lte(picks.settledAt, to + "T23:59:59"));
    }

    const settled = await db
      .select()
      .from(picks)
      .where(and(...conditions));

    // Build CSV
    const headers = [
      "Date",
      "Sport",
      "League",
      "Matchup",
      "Pick",
      "Odds",
      "Units",
      "Result",
      "Closing Odds",
      "CLV",
      "Confidence",
      "Tier",
      "Analysis",
      "Published At",
      "Settled At",
    ];

    const rows = settled.map((p) => [
      p.gameDate || p.publishedAt?.split("T")[0] || "",
      p.sport,
      p.league || "",
      `"${(p.matchup || "").replace(/"/g, '""')}"`,
      `"${(p.pickText || "").replace(/"/g, '""')}"`,
      p.odds != null ? String(p.odds) : "",
      p.units != null ? String(p.units) : "",
      p.result || "",
      p.closingOdds != null ? String(p.closingOdds) : "",
      p.clv != null ? String(p.clv) : "",
      p.confidence || "",
      p.tier || "",
      `"${(p.analysisEn || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      p.publishedAt || "",
      p.settledAt || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // Summary rows at the bottom
    const wins = settled.filter((p) => p.result === "win").length;
    const losses = settled.filter((p) => p.result === "loss").length;
    const pushes = settled.filter((p) => p.result === "push").length;
    const unitsWon = settled.reduce((sum, p) => {
      if (p.result === "win") return sum + (p.units ?? 0);
      if (p.result === "loss") return sum - (p.units ?? 0);
      return sum;
    }, 0);
    const totalRisked = settled
      .filter((p) => p.result !== "push")
      .reduce((sum, p) => sum + (p.units ?? 0), 0);
    const roi = totalRisked > 0 ? ((unitsWon / totalRisked) * 100).toFixed(1) : "0";

    const summary = [
      "",
      "SUMMARY",
      `Record,${wins}-${losses}-${pushes}`,
      `Win Rate,${wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0}%`,
      `Units Won,${unitsWon >= 0 ? "+" : ""}${unitsWon.toFixed(1)}`,
      `ROI,${roi}%`,
      `Total Picks,${settled.length}`,
    ].join("\n");

    const fullCsv = csv + "\n" + summary;

    const filename = `winfact-picks-report${sport && sport !== "All" ? `-${sport}` : ""}${from ? `-from-${from}` : ""}${to ? `-to-${to}` : ""}.csv`;

    return new NextResponse(fullCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export picks" },
      { status: 500 }
    );
  }
}
