import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

type PickData = {
  sport: string;
  league?: string | null;
  matchup: string; // "Team A vs Team B"
  pickText: string;
  gameDate: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  tier: string;
  analysisEn?: string | null;
};

type BlogResult = {
  titleEn: string;
  titleEs: string;
  slug: string;
  bodyEn: string;
  bodyEs: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  altText: string;
  error?: string;
};

const BANNED_WORDS = [
  "landscape", "realm", "delve", "dive into", "game-changer", "unlock",
  "unleash", "leverage", "harness", "navigate", "elevate", "robust",
  "seamless", "cutting-edge", "innovative", "revolutionize", "transformative",
  "empower", "foster", "holistic", "synergy", "paradigm", "pivotal",
  "cornerstone", "spearhead", "tapestry", "multifaceted", "nuanced",
  "moreover", "furthermore", "indeed", "undoubtedly", "it's worth noting",
  "fire protection landscape",
];

const BANNED_OPENERS = [
  "In today's", "In the ever-evolving", "In a world where",
  "When it comes to", "It's no secret that", "As we all know",
  "Picture this:", "Imagine this:", "Let's face it:",
];

const BANNED_PATTERNS = [
  "In conclusion", "In summary", "Overall",
  "not only... but also",
];

function buildBlogPrompt(pick: PickData): string {
  const [awayTeam, homeTeam] = pick.matchup.split(" vs ").map((t) => t.trim());
  const sportLabel = pick.league || pick.sport;
  const dateFormatted = new Date(pick.gameDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `You are a sharp, knowledgeable sports analyst writing for WinFact Picks (WinFactPicks.com), a data-driven sports betting insights platform. Your job is to write a compelling, research-backed game preview blog post.

MATCH DETAILS:
- Sport: ${sportLabel}
- Matchup: ${awayTeam} vs ${homeTeam}
- Date: ${dateFormatted}
- Pick: ${pick.pickText}
${pick.odds ? `- Odds: ${pick.odds > 0 ? "+" : ""}${pick.odds}` : ""}
${pick.units ? `- Units: ${pick.units}` : ""}
${pick.confidence ? `- Confidence: ${pick.confidence}` : ""}
${pick.analysisEn ? `- Analyst Notes: ${pick.analysisEn}` : ""}

WRITING INSTRUCTIONS:
Write a detailed, conversational, data-backed game preview. Write naturally like a knowledgeable sports analyst breaking down the matchup for fans. Focus on storytelling backed by stats and current context.

LENGTH: 800-1000 words minimum. Do not cut short.

CONTENT STRUCTURE (follow this flow, but vary paragraph lengths):
1. Opening Hook (2-3 sentences): Lead with the most compelling angle for THIS specific game. What makes it interesting? Rivalry? Streak? Stakes? Star matchup?
2. Game Context: Where both teams sit in standings, what is at stake, why this matters right now.
3. Recent Form: Last 5-10 games performance for both teams. Momentum, trends, hot/cold streaks.
4. Head-to-Head: Recent meetings, historical trends, series edge.
5. Key Players (2-3 per team): Current season stats, why they matter tonight. Be specific with numbers.
6. Injuries & Lineup Notes: Who is out, questionable, returning. How it changes the game plan.
7. Tactical Matchup / X-Factor: The one thing that will likely decide this game.
8. Venue & Environmental Factors: Home/away splits, travel schedule, crowd factor, weather if outdoor.
9. Statistical Edge: 2-3 specific stats that reveal real advantages.
10. Betting Relevance Tease (2-3 sentences): Reference spreads, totals, or trends naturally. Do NOT give the actual pick away. Tease that premium analysis is available.

WINFACT CALLOUTS (embed exactly 2, naturally):
- One mid-article: Something like "For those tracking this matchup closer, WinFact's model has been flagging [relevant trend]. Premium members get real-time edge alerts for games like these."
- One at the end: Something like "Want the full breakdown with our model's pick? Check out today's slate at WinFactPicks.com"

TONE RULES:
- Write like you are explaining the game to a knowledgeable friend at a bar. Confident, specific, human.
- Match the tone to the sport and game context: playoff intensity for big games, casual for regular season, heated for rivalries.
- Be authoritative but accessible. No jargon without context.
- Vary sentence length. Mix short punchy lines with longer analytical ones.
- Vary paragraph length. Not every section the same size.

ABSOLUTE RULES (VIOLATING THESE FAILS THE TASK):
- NEVER use em dashes (--) anywhere in the text. Use commas, periods, parentheses, or colons instead.
- NEVER use more than one exclamation mark in the entire post.
- NEVER start the conclusion with "In conclusion," "In summary," or "Overall"
- NEVER use "not only... but also" construction
- NEVER write headers that are ALL questions (mix formats)
- NEVER write like a press release or marketing brochure

BANNED WORDS (do not use any of these):
${BANNED_WORDS.join(", ")}

BANNED OPENERS (never start a paragraph with):
${BANNED_OPENERS.join(", ")}

BANNED PATTERNS:
${BANNED_PATTERNS.join(", ")}

FORMAT YOUR RESPONSE EXACTLY AS:
TITLE_EN: [Compelling angle-based title, not generic "Team A vs Team B Preview". Find the biggest storyline.]
SLUG: [url-friendly-slug-with-teams-and-date]
SEO_TITLE: [60 chars max. Main hook + both team names + "preview" or "analysis"]
SEO_DESC: [150-160 chars. Lead with main storyline, mention key factors, include date. Make it clickable.]
EXCERPT: [2-3 punchy sentences that hook the reader. Answer "why should I care about this game?"]
ALT_TEXT: [Descriptive alt text for featured image: "${awayTeam} vs ${homeTeam} game preview matchup graphic"]
BODY_EN:
[Full blog post in Markdown. Use ## for section headers. Do not use # h1.]
BODY_ES:
[Complete Spanish translation of the blog post. Same quality, same structure, natural Spanish, not robotic translation.]`;
}

export async function generateGameBlog(pick: PickData): Promise<BlogResult> {
  try {
    const client = getClient();
    const prompt = buildBlogPrompt(pick);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const titleEn = text.match(/TITLE_EN:\s*(.*?)(?=\n)/)?.[1]?.trim() || "";
    const slug = text.match(/SLUG:\s*(.*?)(?=\n)/)?.[1]?.trim() || "";
    const seoTitle = text.match(/SEO_TITLE:\s*(.*?)(?=\n)/)?.[1]?.trim() || "";
    const seoDescription =
      text.match(/SEO_DESC:\s*(.*?)(?=\n)/)?.[1]?.trim() || "";
    const excerpt = text.match(/EXCERPT:\s*(.*?)(?=\n(?:ALT_TEXT|BODY))/s)?.[1]?.trim() || "";
    const altText = text.match(/ALT_TEXT:\s*(.*?)(?=\n)/)?.[1]?.trim() || "";
    const bodyEn =
      text.match(/BODY_EN:\s*([\s\S]*?)(?=BODY_ES:)/)?.[1]?.trim() || "";
    const bodyEs = text.match(/BODY_ES:\s*([\s\S]*?)$/)?.[1]?.trim() || "";

    // Generate Spanish title from body context
    const titleEs = await translateTitle(titleEn);

    return { titleEn, titleEs, slug, bodyEn, bodyEs, seoTitle, seoDescription, excerpt, altText };
  } catch (error) {
    console.error("Blog generation error:", error);
    return {
      titleEn: "",
      titleEs: "",
      slug: "",
      bodyEn: "",
      bodyEs: "",
      seoTitle: "",
      seoDescription: "",
      excerpt: "",
      altText: "",
      error: String(error),
    };
  }
}

async function translateTitle(titleEn: string): Promise<string> {
  if (!titleEn) return "";
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Translate this sports blog title to natural Spanish. Only respond with the translation, nothing else:\n\n${titleEn}`,
        },
      ],
    });
    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : titleEn;
  } catch {
    return titleEn;
  }
}

export function buildImagePrompt(matchup: string, sport: string): string {
  const [awayTeam, homeTeam] = matchup.split(" vs ").map((t) => t.trim());

  return `Create a high-resolution split-screen digital composition portraying a fierce visual showdown between: ${awayTeam} vs ${homeTeam} (${sport})

Left Side: Use the first team's (${awayTeam}) official color palette (primary and secondary team colors) to dominate the left half. Integrate background textures and elements tied to the team's identity with light-enhanced and well-lit blended layers (e.g., city, mascot, heritage, symbolism). Apply subtle overlays like brushed steel, morning fog, historical references, or natural textures relevant to the team's story or culture. Incorporate a faint background graphic linked to their mascot or theme.

Right Side: Use the second team's (${homeTeam}) brand colors and stylistic elements to mirror the same visual power. Utilize textures depending on the team's essence, but favor clarity, vibrancy, and luminance over dark or muted tones. Incorporate a backdrop design element related to their mascot, theme, or city.

Center Focus: Place both teams' official logos prominently and symmetrically at the center of the frame, facing each other in a bold, confrontational posture. Make sure they are balanced and proportionally sized.

Styling Notes:
- Keep the design minimal, premium, and free of any text or player imagery.
- Use lighter atmospheric gradients, gentle light flares, and soft blending to keep the visual flow between both sides.
- Prioritize authentic brand representation using only official color schemes and logo files.
- Allow textures and layered visual motifs to express team personality without overpowering the central logos.
- Lighting should emphasize vibrance and depth, avoiding overly dark contrasts, and enhancing overall brightness to ensure clarity and digital appeal.
- Horizontal landscape orientation (16:9 aspect ratio).

This artwork should reflect both teams' unique identities while delivering a cohesive, professional sports brand aesthetic suitable for digital media.`;
}
