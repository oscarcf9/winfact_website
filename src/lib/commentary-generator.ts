import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function generateCommentary(game: {
  sport: string;
  league: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number;
  clock: string;
  situation: string;
}): Promise<string> {
  // ~60% Spanish, ~40% English — matches bilingual group dynamics
  const language = Math.random() < 0.6 ? "spanish" : "english";

  const sportContext = getSportContext(game.sport, game.period);

  const prompt = `You are a passionate sports fan live-commenting in a Telegram group. Generate ONE short comment (max 250 characters) about this LIVE game.

Sport: ${game.sport} (${game.league})
Teams: ${game.team1} vs ${game.team2}
Score: ${game.score1} - ${game.score2}
Period: ${sportContext}
Clock: ${game.clock}
Game situation: ${game.situation}

Language: ${language}
${language === "spanish" ? "Use casual Latin American Spanish. Miami/Caribbean vibe." : "Use casual American English. Like texting your boys about the game."}

STRICT RULES:
- Maximum 250 characters
- Casual and natural — like you're watching the game RIGHT NOW
- Use 1-2 relevant emojis
- Be HONEST about what you see — if it's a blowout, say it. If it's close, show excitement.
- DO NOT be neutral or diplomatic — have a take
- DO NOT use hashtags
- DO NOT mention betting, picks, odds, or predictions
- DO NOT say "right now" or "currently" or "at the moment"
- DO NOT use quotation marks
- DO NOT add any preamble — output ONLY the comment text

TONE EXAMPLES (${language}):
${language === "spanish" ? `
"Napoli dominando todo el segundo tiempo y no hicieron nada"
"Lakers perdiendo por 15 en el tercero, se les acabo"
"Arsenal 2-2 Chelsea, esto esta que arde"
"Home run de Soto con bases llenas"
"Ya van 6 goles en este partido, que locura"
"Se puso bueno esto, empate en el ultimo cuarto"
` : `
"Lakers down 15 in the 3rd, wrap it up"
"This Arsenal-Chelsea game is INSANE"
"Soto just cleared the bases with a grand slam"
"6 goals already in this one, absolute chaos"
"Tied up going into the 4th, this is what we watch for"
"First quarter was a shootout, 65 points already"
`}

Generate ONLY the comment. Nothing else.`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    // Safety: strip wrapping quotes and any hashtags
    let comment = text
      .replace(/^["']|["']$/g, "")
      .replace(/#\w+/g, "")
      .trim();

    if (comment.length > 280) {
      comment = comment.substring(0, 277) + "...";
    }

    return comment;
  } catch (error) {
    console.error("[commentary] Claude API error:", error);
    return "";
  }
}

function getSportContext(sport: string, period: number): string {
  switch (sport) {
    case "NBA":
    case "NFL":
      return `${ordinal(period)} quarter`;
    case "MLB":
      return `${ordinal(period)} inning`;
    case "NHL":
      return `${ordinal(period)} period`;
    default:
      return period === 1 ? "1st half" : "2nd half";
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
