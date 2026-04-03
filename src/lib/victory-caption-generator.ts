import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export async function generateVictoryCaption(pick: {
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  tier: "free" | "vip";
}): Promise<string> {
  const language = Math.random() < 0.5 ? "english" : "spanish";
  const oddsStr = pick.odds
    ? pick.odds > 0 ? `+${pick.odds}` : `${pick.odds}`
    : "N/A";

  const prompt = `Generate an Instagram caption for a winning sports pick post by WinFact Picks (@winfact_picks), a data-driven sports betting picks service.

Pick details:
- Sport: ${pick.sport}
- Matchup: ${pick.matchup}
- Pick: ${pick.pickText}
- Odds: ${oddsStr}
- Tier: ${pick.tier === "vip" ? "VIP (exclusive paid pick)" : "Free (given to everyone)"}
- Result: WIN

Language: ${language}
${language === "spanish" ? "Write in casual Latin American Spanish — Miami vibe, confident, celebratory." : "Write in casual American English — confident, not arrogant, celebratory."}

RULES:
- 2-4 sentences MAX. Short and punchy.
- Celebratory but not over the top. Confident, not cocky.
- Reference the data/model if natural ("the model called it", "data doesn't miss", "los datos no fallan")
- If VIP tier: mention that this was an exclusive VIP play, hint at the value of joining
- If Free tier: mention it was a free pick — "we gave this one away for free"
- Include a brief CTA — "Link in bio" or "winfactpicks.com" naturally
- End with 8-12 relevant hashtags on a new line
- Hashtags should include: #WinFactPicks #SportsBetting #${pick.sport} + relevant team/league tags
- DO NOT use quotation marks around the caption
- Output ONLY the caption text + hashtags. No preamble.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text"
    ? response.content[0].text.trim()
    : "";

  return text.replace(/^["']|["']$/g, "").trim();
}
