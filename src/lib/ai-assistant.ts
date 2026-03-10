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
    const prompt = `You are a professional sports betting analyst for WinFact Picks. Generate a concise, data-driven analysis for this pick:

Sport: ${context.sport}
Matchup: ${context.matchup}
${context.odds ? `Odds: ${context.odds > 0 ? "+" : ""}${context.odds}` : ""}
${context.modelEdge ? `Model Edge: ${context.modelEdge}%` : ""}
${context.injuries ? `Injuries: ${context.injuries}` : ""}
${context.lineHistory ? `Line History: ${context.lineHistory}` : ""}
${context.sharpAction ? `Sharp Action: ${context.sharpAction}` : ""}

Write 2-3 sentences. Be specific and analytical. Focus on why this is a good bet.
Then provide the Spanish translation.

Format:
EN: [English analysis]
ES: [Spanish analysis]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const enMatch = text.match(/EN:\s*(.*?)(?=\nES:|$)/s);
    const esMatch = text.match(/ES:\s*(.*?)$/s);

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
    const prompt = `You are a content writer for WinFact Picks, a data-driven sports betting platform. Write a blog post about:

Topic: ${topic}
Sport: ${sport}
Target Keywords: ${keywords.join(", ")}

Write an engaging, SEO-optimized blog post (500-800 words). Include data points, trends, and actionable insights for sports bettors.

Format your response as:
TITLE_EN: [English title]
TITLE_ES: [Spanish title]
BODY_EN:
[English body in Markdown]
BODY_ES:
[Spanish body in Markdown]`;

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
    const units = picks.reduce((sum, p) => {
      if (p.result === "win") return sum + p.units;
      if (p.result === "loss") return sum - p.units;
      return sum;
    }, 0);

    const prompt = `Generate a concise weekly recap newsletter for WinFact Picks subscribers.

Record: ${wins}-${losses}
Units: ${units >= 0 ? "+" : ""}${units.toFixed(1)}
ROI: ${picks.length > 0 ? ((units / picks.reduce((s, p) => s + p.units, 0)) * 100).toFixed(1) : 0}%

Picks:
${picksStr}

Write an engaging 200-300 word recap. Highlight key wins, analyze the week's performance, and preview next week.

Format:
EN: [English recap]
ES: [Spanish recap]`;

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
    const prompt = `You are a sports analytics expert. Analyze this injury report and estimate point spread impact:

Sport: ${sport}
Matchup: ${matchup}
Injury Report: ${injuryReport}

Respond with:
IMPACT: [1-2 sentence analysis]
SPREAD_ADJUSTMENT: [number, positive favors home, negative favors away, e.g., -1.5]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const impactMatch = text.match(/IMPACT:\s*(.*?)(?=\n|$)/);
    const adjMatch = text.match(/SPREAD_ADJUSTMENT:\s*([-\d.]+)/);

    return {
      impact: impactMatch?.[1]?.trim() || text,
      spreadAdjustment: parseFloat(adjMatch?.[1] || "0"),
    };
  } catch (error) {
    return { impact: "", spreadAdjustment: 0, error: String(error) };
  }
}
