import { NextResponse } from "next/server";
import { db } from "@/db";
import { commentaryLog } from "@/db/schema";
import { gte } from "drizzle-orm";
import { sendAdminNotification } from "@/lib/telegram";

/**
 * GET /api/cron/commentary-digest
 *
 * Daily digest of live commentary bot activity sent to Oscar's admin Telegram.
 * Runs at 1 AM ET (after all games finish). Summarizes the last 24 hours.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const entries = await db
      .select()
      .from(commentaryLog)
      .where(gte(commentaryLog.postedAt, cutoff));

    if (entries.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no_commentary_today" });
    }

    // Count by sport
    const sportCounts: Record<string, number> = {};
    for (const e of entries) {
      sportCounts[e.sport] = (sportCounts[e.sport] || 0) + 1;
    }
    const sportSummary = Object.entries(sportCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([sport, count]) => `${sport} (${count})`)
      .join(", ");

    // Detect language (simple heuristic)
    let esCount = 0;
    let enCount = 0;
    for (const e of entries) {
      if (/[áéíóúñ¿¡]/i.test(e.message)) esCount++;
      else enCount++;
    }

    // Sport emoji map
    const sportEmoji: Record<string, string> = {
      NBA: "🏀", MLB: "⚾", NFL: "🏈", NHL: "🏒",
      MLS: "⚽", Soccer: "⚽", NCAA: "🏀", NCAAF: "🏈",
    };

    // Last 5 comments
    const recent = entries
      .sort((a, b) => b.postedAt - a.postedAt)
      .slice(0, 5);

    const recentLines = recent.map((e) => {
      const emoji = sportEmoji[e.sport] || "🎯";
      const gameState = e.gameState ? JSON.parse(e.gameState) : null;
      const score = gameState?.score || "";
      const preview = e.message.length > 60 ? e.message.slice(0, 60) + "..." : e.message;
      return `${emoji} ${score ? `(${score}) ` : ""}${preview}`;
    });

    const message =
      `📊 <b>LIVE COMMENTARY DIGEST</b>\n\n` +
      `Today: <b>${entries.length}</b> comments posted\n` +
      `Sports: ${sportSummary}\n` +
      `Languages: ES (${esCount}), EN (${enCount})\n\n` +
      `Recent comments:\n` +
      recentLines.map((l) => `- ${l}`).join("\n") +
      `\n\n💡 Manage: /admin/commentary`;

    await sendAdminNotification(message);

    return NextResponse.json({
      status: "sent",
      totalComments: entries.length,
      sports: sportCounts,
    });
  } catch (error) {
    console.error("[commentary-digest] Error:", error);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
