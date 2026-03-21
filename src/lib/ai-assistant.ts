import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

type PickContext = {
  sport: string;
  matchup: string;
  odds?: number;
  modelEdge?: number;
  injuries?: string;
  lineHistory?: string;
  sharpAction?: string;
};

export async function generatePickAnalysis(
  context: PickContext
): Promise<{ en: string; es: string; error?: string }> {
  try {
    const client = getClient();
    const prompt = `You are the head analyst at WinFact Picks, a premium sports betting advisory service. Produce a professional pick analysis.

GAME INFO:
- Sport: ${context.sport}
- Matchup: ${context.matchup}
${context.odds ? `- Current Odds: ${context.odds > 0 ? "+" : ""}${context.odds}` : ""}
${context.modelEdge ? `- Model Edge: ${context.modelEdge}%` : ""}
${context.injuries ? `- Key Injuries: ${context.injuries}` : ""}
${context.lineHistory ? `- Line Movement: ${context.lineHistory}` : ""}
${context.sharpAction ? `- Sharp Action: ${context.sharpAction}` : ""}

Write a structured analysis in this EXACT format (use the headers exactly as shown):

EN:
**Pick:** [The specific bet recommendation]
**Confidence:** [Standard / Strong / Top Play]

**Why We Like This:**
[2-3 sentences on the key factors driving this pick. Be specific about matchup advantages, trends, or situational spots.]

**Key Factor:**
[1 sentence on the single most important reason this bet has value]

**Risk:**
[1 sentence on what could go wrong]

ES:
[Same structure fully translated to natural Spanish - not robotic translation]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const enMatch = text.match(/EN:\s*([\s\S]*?)(?=\nES:)/);
    const esMatch = text.match(/ES:\s*([\s\S]*?)$/);

    return {
      en: enMatch?.[1]?.trim() || text,
      es: esMatch?.[1]?.trim() || "",
    };
  } catch (error) {
    return { en: "", es: "", error: String(error) };
  }
}

export async function generateBlogPost(
  topic: string,
  sport: string,
  keywords: string[]
): Promise<{ titleEn: string; titleEs: string; bodyEn: string; bodyEs: string; error?: string }> {
  try {
    const client = getClient();
    const prompt = `You are a sports content writer for WinFact Picks, a bilingual (EN/ES) sports betting platform.

Write a blog post about: ${topic}
Sport: ${sport}
SEO Keywords: ${keywords.join(", ")}

Requirements:
- 500-800 words
- Engaging, conversational tone (not robotic or overly formal)
- Include real betting angles and actionable takeaways
- Use subheadings to break up sections
- End with a clear call-to-action for WinFact VIP
- No em dashes, no "leverage", no "utilize", no "it's worth noting"
- Write like a sharp bettor talking to other sharp bettors

Format your response EXACTLY as:
TITLE_EN: [Compelling English title - under 70 chars]
TITLE_ES: [Natural Spanish title - not a robotic translation]
BODY_EN:
[English body in HTML - use <h2>, <h3>, <p>, <strong>, <ul>/<li> tags]
BODY_ES:
[Spanish body in HTML - natural Spanish, same structure]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const titleEnMatch = text.match(/TITLE_EN:\s*(.*?)(?=\n)/);
    const titleEsMatch = text.match(/TITLE_ES:\s*(.*?)(?=\n)/);
    const bodyEnMatch = text.match(/BODY_EN:\s*([\s\S]*?)(?=BODY_ES:)/);
    const bodyEsMatch = text.match(/BODY_ES:\s*([\s\S]*?)$/);

    return {
      titleEn: titleEnMatch?.[1]?.trim() || "",
      titleEs: titleEsMatch?.[1]?.trim() || "",
      bodyEn: bodyEnMatch?.[1]?.trim() || "",
      bodyEs: bodyEsMatch?.[1]?.trim() || "",
    };
  } catch (error) {
    return { titleEn: "", titleEs: "", bodyEn: "", bodyEs: "", error: String(error) };
  }
}

export async function generateWeeklyRecap(
  picks: Array<{ sport: string; matchup: string; pickText: string; result: string; units: number }>
): Promise<{ en: string; es: string; error?: string }> {
  try {
    const client = getClient();
    const picksStr = picks
      .map((p) => `${p.sport}: ${p.matchup} - ${p.pickText} → ${p.result} (${p.result === "win" ? "+" : p.result === "loss" ? "-" : ""}${p.units}u)`)
      .join("\n");

    const wins = picks.filter((p) => p.result === "win").length;
    const losses = picks.filter((p) => p.result === "loss").length;
    const pushes = picks.filter((p) => p.result === "push").length;
    const units = picks.reduce((sum, p) => {
      if (p.result === "win") return sum + p.units;
      if (p.result === "loss") return sum - p.units;
      return sum;
    }, 0);

    const prompt = `Write a weekly recap for WinFact Picks subscribers. Conversational, confident tone.

RESULTS:
Record: ${wins}-${losses}${pushes > 0 ? `-${pushes}` : ""}
Units: ${units >= 0 ? "+" : ""}${units.toFixed(1)}u
ROI: ${picks.length > 0 ? ((units / picks.reduce((s, p) => s + p.units, 0)) * 100).toFixed(1) : 0}%

PICKS:
${picksStr || "No picks this week."}

Write 200-300 words. Structure:

**Week in Review:**
[Summary of the week's performance, highlight biggest wins]

**What Worked:**
[What betting angles hit this week]

**Looking Ahead:**
[Brief preview of what's coming next week]

Keep it real, no fluff. Write like you're texting a friend who bets, not writing a corporate newsletter.

Format:
EN:
[English recap with **bold** headers]
ES:
[Spanish recap - natural, not robotic]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const enMatch = text.match(/EN:\s*([\s\S]*?)(?=\nES:)/);
    const esMatch = text.match(/ES:\s*([\s\S]*?)$/);

    return {
      en: enMatch?.[1]?.trim() || text,
      es: esMatch?.[1]?.trim() || "",
    };
  } catch (error) {
    return { en: "", es: "", error: String(error) };
  }
}

export async function generateInjuryImpact(
  injuryReport: string,
  sport: string,
  matchup: string
): Promise<{ impact: string; spreadAdjustment: number; error?: string }> {
  try {
    const client = getClient();
    const prompt = `You are a sports analytics expert at WinFact Picks. Analyze this injury report and estimate the betting impact.

Sport: ${sport}
Matchup: ${matchup}
Injury Report:
${injuryReport}

Respond in this EXACT format:

IMPACT:
**Severity:** [Low / Medium / High / Critical]
**Line Impact:** [How many points this shifts the spread, e.g., +1.5 means home team benefits by 1.5 points]

**Breakdown:**
[2-3 sentences analyzing how each injury affects the game. Be specific about roles, minutes, and replacement quality.]

**Betting Angle:**
[1-2 sentences on how to bet around these injuries]

SPREAD_ADJUSTMENT: [number only, positive favors home, negative favors away]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const impactMatch = text.match(/IMPACT:\s*([\s\S]*?)(?=SPREAD_ADJUSTMENT:)/);
    const adjMatch = text.match(/SPREAD_ADJUSTMENT:\s*([-\d.]+)/);

    return {
      impact: impactMatch?.[1]?.trim() || text,
      spreadAdjustment: parseFloat(adjMatch?.[1] || "0"),
    };
  } catch (error) {
    return { impact: "", spreadAdjustment: 0, error: String(error) };
  }
}
