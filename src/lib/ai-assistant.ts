import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type PickContext = {
  sport: string;
  matchup: string;
  gameTime?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeOdds?: number;
  awayOdds?: number;
  homeSpread?: number;
  totalLine?: number;
  overOdds?: number;
  underOdds?: number;
  odds?: number;
  modelEdge?: number;
  injuries?: string;
  lineHistory?: string;
  sharpAction?: string;
  capperNotes?: string;
  betTypePreference?: string;
};

export async function generatePickAnalysis(
  context: PickContext
): Promise<{ en: string; es: string; error?: string }> {
  try {
    const client = getClient();

    const systemPrompt = `Eres el analista principal de WinFact Picks, un servicio premium de analisis de apuestas deportivas. Tu analisis debe ser 100% basado en los datos proporcionados. NO inventes estadisticas. Si los datos son insuficientes para una recomendacion solida, dilo claramente. Responde SOLO en espanol.`;

    const homeLabel = context.homeTeam || context.matchup.split(" vs ")[1]?.trim() || "Home";
    const awayLabel = context.awayTeam || context.matchup.split(" vs ")[0]?.trim() || "Away";

    const prompt = `Analiza el siguiente partido y proporciona una recomendacion de apuesta.

PARTIDO:
- Deporte: ${context.sport}
- Enfrentamiento: ${context.matchup}
${context.gameTime ? `- Hora: ${context.gameTime}` : ""}

DATOS DEL MERCADO:
${context.homeOdds && context.awayOdds ? `- Moneyline: ${homeLabel} ${context.homeOdds > 0 ? "+" : ""}${context.homeOdds} / ${awayLabel} ${context.awayOdds > 0 ? "+" : ""}${context.awayOdds}` : ""}
${context.homeSpread != null ? `- Spread: ${homeLabel} ${context.homeSpread > 0 ? "+" : ""}${context.homeSpread}` : ""}
${context.totalLine ? `- Total: ${context.totalLine} (Over ${context.overOdds || ""} / Under ${context.underOdds || ""})` : ""}
${context.odds ? `- Odds: ${context.odds > 0 ? "+" : ""}${context.odds}` : ""}
${context.modelEdge ? `- Model Edge: ${context.modelEdge}%` : ""}
${context.sharpAction ? `- Accion Sharp: ${context.sharpAction}` : ""}
${context.lineHistory ? `- Movimiento de linea: ${context.lineHistory}` : ""}

LESIONES:
${context.injuries || "No hay informacion de lesiones disponible."}

CONTEXTO ADICIONAL DEL CAPPER:
${context.capperNotes || "Ninguno."}

${context.betTypePreference ? `PREFERENCIA DE MERCADO: ${context.betTypePreference}` : "Elige el mercado con mayor ventaja estadistica."}

Responde con esta estructura EXACTA:

**PICK:** [La apuesta especifica, ej: "Lakers -6.5 (-110)"]
**CONFIANZA:** [Estandar / Fuerte / Top Play]
**UNIDADES:** [1-5, donde 5 = maxima confianza]

**ANALISIS:**
[3-5 oraciones analizando el enfrentamiento. Usa los datos proporcionados. Menciona factores situacionales, tendencias relevantes basadas en lo que sabes del deporte, y por que esta linea tiene valor.]

**IMPACTO DE LESIONES:**
[1-2 oraciones sobre como las lesiones afectan la linea y el resultado esperado. Si no hay lesiones reportadas, indica que esto es favorable o neutral.]

**FACTOR CLAVE:**
[1 oracion sobre la razon principal por la que esta apuesta tiene valor]

**RIESGO:**
[1 oracion sobre que podria salir mal]

**MERCADOS ALTERNATIVOS:**
[Si hay valor en otros mercados (total, prop, etc.), mencionalos brevemente. Si no, omite esta seccion.]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        { role: "user", content: prompt },
      ],
      system: systemPrompt,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return {
      en: "",
      es: text.trim(),
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

    const prompt = `Eres el director de contenido de WinFact Picks. Genera un resumen semanal para el grupo de Telegram en espanol. Tono: conversacional, confiado, como hablando con amigos que apuestan. NO inventes datos, usa solo los numeros proporcionados.

RESULTADOS DE LA SEMANA:
Record: ${wins}-${losses}${pushes > 0 ? `-${pushes}` : ""}
Unidades: ${units >= 0 ? "+" : ""}${units.toFixed(1)}u
ROI: ${picks.length > 0 ? ((units / picks.reduce((s, p) => s + p.units, 0)) * 100).toFixed(1) : 0}%

PICKS:
${picksStr || "No hubo picks esta semana."}

Escribe 200-300 palabras con esta estructura:

**Resumen Semanal WinFact**

**Record:** ${wins}-${losses}${pushes > 0 ? `-${pushes}` : ""} | **Unidades:** ${units >= 0 ? "+" : ""}${units.toFixed(1)}u | **ROI:** ${picks.length > 0 ? ((units / picks.reduce((s, p) => s + p.units, 0)) * 100).toFixed(1) : 0}%

**Lo que paso:**
[2-3 oraciones resumiendo la semana. Menciona los mejores hits.]

**Lo que funciono:**
[2-3 oraciones sobre que angulos de apuesta funcionaron mejor.]

**Mirando adelante:**
[1-2 oraciones sobre lo que viene la proxima semana.]

Unete a WinFact VIP en winfactpicks.com/pricing`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return {
      en: "",
      es: text.trim(),
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
