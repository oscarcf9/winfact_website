import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { checkAdminRateLimit, rateLimitResponse } from "@/lib/admin-rate-limit";
import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  // Rate limit: 12 captions/min should cover legitimate generation flow,
  // but stops a stuck button from spending $1+ per minute.
  const limited = checkAdminRateLimit("victory-caption", 60_000, 12);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterMs);

  const body = await req.json();
  const { sport, matchup, pickText, odds, units, tier, winner } = body;

  if (!sport || !matchup || !winner) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const oddsStr = odds != null ? (odds > 0 ? `+${odds}` : String(odds)) : "";
  const unitsStr = units != null ? `${units}u` : "";
  const tierLabel = tier === "vip" ? "VIP" : "Free";

  try {
    const client = getAnthropic();

    const [enRes, esRes] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `Generate an Instagram caption celebrating a winning sports pick by WinFact Picks (@winfact_picks).

CONTEXT:
- Sport: ${sport}
- Matchup: ${matchup}
- Pick: ${pickText}
- Odds: ${oddsStr}
- Units: ${unitsStr}
- Tier: ${tierLabel}
- Winner: ${winner}

RULES:
- English language
- Celebratory, confident tone — this is a WIN celebration
- 3-5 lines max
- Include 1-2 relevant emojis per line
- Reference the specific pick and result
- End with a call to action ("Follow for more" / "Link in bio" / "Join the team")
- Close with 10-15 hashtags on a new line: teams, sport, betting, winning
- No fake stats. Only reference real info provided above.
- Output ONLY the caption with hashtags. No preamble, no explanation.`,
        }],
      }),
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `Generate an Instagram caption celebrating a winning sports pick by WinFact Picks (@winfact_picks).

CONTEXT:
- Sport: ${sport}
- Matchup: ${matchup}
- Pick: ${pickText}
- Odds: ${oddsStr}
- Units: ${unitsStr}
- Tier: ${tierLabel}
- Winner: ${winner}

RULES:
- Spanish language (Latin American, Miami vibe)
- Celebratory, confident tone — this is a WIN celebration
- 3-5 lines max
- Include 1-2 relevant emojis per line
- Reference the specific pick and result
- End with a call to action
- Close with 10-15 hashtags on a new line
- No fake stats. Only reference real info provided above.
- Output ONLY the caption with hashtags. No preamble, no explanation.`,
        }],
      }),
    ]);

    const captionEn = enRes.content[0].type === "text" ? enRes.content[0].text.trim() : "";
    const captionEs = esRes.content[0].type === "text" ? esRes.content[0].text.trim() : "";

    return NextResponse.json({ captionEn, captionEs });
  } catch (error) {
    console.error("[generate-caption] Error:", error);
    return NextResponse.json({ error: "Caption generation failed" }, { status: 500 });
  }
}
