import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

const VICTORY_SYSTEM_PROMPT = `You write Instagram victory captions for WinFact Picks (@winfact_picks), a data-driven sports betting picks service.

UNIVERSAL RULES (apply to every output):
- 2-4 sentences MAX. Short and punchy.
- Celebratory but not over the top. Confident, not cocky.
- Reference the data/model if natural ("the model called it", "data doesn't miss", "los datos no fallan")
- VIP tier: mention exclusive VIP play, hint at value of joining
- Free tier: mention it was a free pick — "we gave this one away for free"
- Include a brief CTA — "Link in bio" or "winfactpicks.com" naturally
- 8-12 hashtags on a new line: #WinFactPicks #SportsBetting + sport + relevant team/league tags
- DO NOT use quotation marks around the caption
- English: casual American English — confident, celebratory
- Spanish: casual Latin American Spanish — Miami vibe, confident, celebratory`;

/**
 * Generate BOTH English and Spanish victory captions in a SINGLE Claude call.
 * Halves Anthropic spend vs prior two-call approach (~$17/mo savings at 96
 * ticks/day) and keeps both versions thematically consistent.
 *
 * The shared system prompt is marked cache_control:ephemeral so the
 * Anthropic prompt cache amortizes its tokens across all victories.
 */
export async function generateBilingualCaptions(pick: {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  tier: "free" | "vip";
}): Promise<{ captionEn: string; captionEs: string }> {
  const oddsStr = pick.odds
    ? pick.odds > 0 ? `+${pick.odds}` : `${pick.odds}`
    : "N/A";

  const userMsg = `Pick details:
- Sport: ${pick.sport}
- Matchup: ${pick.matchup}
- Pick: ${pick.pickText}
- Odds: ${oddsStr}
- Tier: ${pick.tier === "vip" ? "VIP (exclusive paid pick)" : "Free (given to everyone)"}
- Result: WIN

Output BOTH captions, exactly in this format with the literal markers:

===EN===
<English caption + hashtags>

===ES===
<Spanish (Latin American, Miami vibe) caption + hashtags>`;

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: VICTORY_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        } as unknown as { type: "text"; text: string },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const enMatch = raw.match(/===EN===\s*([\s\S]*?)(?:===ES===|$)/i);
    const esMatch = raw.match(/===ES===\s*([\s\S]*?)$/i);
    const clean = (s: string) => s.replace(/^["']|["']$/g, "").trim();
    return {
      captionEn: clean(enMatch?.[1]?.trim() || raw),
      captionEs: clean(esMatch?.[1]?.trim() || ""),
    };
  } catch (error) {
    console.error("[victory-caption] generation failed:", error);
    return { captionEn: "", captionEs: "" };
  }
}

/**
 * Single-language helper kept for legacy callers (tests, admin tools).
 * New code should use generateBilingualCaptions.
 */
export async function generateVictoryCaption(pick: {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  tier: "free" | "vip";
}, language: "english" | "spanish" = "english"): Promise<string> {
  const both = await generateBilingualCaptions(pick);
  return language === "spanish" ? both.captionEs : both.captionEn;
}
