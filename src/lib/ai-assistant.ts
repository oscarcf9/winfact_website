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
  // Odds data
  homeOdds?: number;
  awayOdds?: number;
  homeSpread?: number;
  totalLine?: number;
  overOdds?: number;
  underOdds?: number;
  odds?: number;
  modelEdge?: number;
  // Enrichment data (from ESPN + Odds API)
  venue?: string;
  homeRecord?: string;
  awayRecord?: string;
  homeHomeRecord?: string;
  awayAwayRecord?: string;
  homeForm?: string[];
  awayForm?: string[];
  injuries?: string;
  starters?: string;
  teamStats?: string;
  bookmakerComparison?: string;
  headlines?: string[];
  // Manual inputs
  sharpAction?: string;
  lineHistory?: string;
  capperNotes?: string;
  betTypePreference?: string;
};

function fmtOdds(v?: number): string {
  if (v == null) return "";
  return v > 0 ? `+${v}` : `${v}`;
}

export async function generatePickAnalysis(
  context: PickContext
): Promise<{ en: string; es: string; error?: string }> {
  try {
    const client = getClient();

    const systemPrompt = `Eres el analista principal de WinFact Picks, un servicio premium de analisis de apuestas deportivas. Tu analisis debe ser 100% basado en los datos proporcionados. NO inventes estadisticas, records, ni datos que no aparezcan abajo. Si algo no esta en los datos, no lo menciones. Responde SOLO en espanol.`;

    const homeLabel = context.homeTeam || context.matchup.split(" vs ")[1]?.trim() || "Home";
    const awayLabel = context.awayTeam || context.matchup.split(" vs ")[0]?.trim() || "Away";

    const prompt = `Analiza este partido y recomienda la mejor apuesta.

═══ PARTIDO ═══
Deporte: ${context.sport}
Enfrentamiento: ${context.matchup}
${context.gameTime ? `Hora: ${context.gameTime}` : ""}
${context.venue ? `Sede: ${context.venue}` : ""}

═══ RECORDS ═══
${context.homeRecord ? `${homeLabel}: ${context.homeRecord}${context.homeHomeRecord ? ` (Casa: ${context.homeHomeRecord})` : ""}` : `${homeLabel}: No disponible`}
${context.awayRecord ? `${awayLabel}: ${context.awayRecord}${context.awayAwayRecord ? ` (Visitante: ${context.awayAwayRecord})` : ""}` : `${awayLabel}: No disponible`}

═══ LINEAS DE APUESTAS ═══
${context.homeOdds && context.awayOdds ? `Moneyline: ${homeLabel} ${fmtOdds(context.homeOdds)} / ${awayLabel} ${fmtOdds(context.awayOdds)}` : "Moneyline: No disponible"}
${context.homeSpread != null ? `Spread: ${homeLabel} ${fmtOdds(context.homeSpread)}` : "Spread: No disponible"}
${context.totalLine ? `Total: O/U ${context.totalLine} (Over ${fmtOdds(context.overOdds)} / Under ${fmtOdds(context.underOdds)})` : "Total: No disponible"}
${context.modelEdge ? `Model Edge: ${context.modelEdge}%` : ""}

═══ MEJORES LINEAS POR LIBRO ═══
${context.bookmakerComparison || "Solo un libro disponible."}

═══ ACCION SHARP ═══
${context.sharpAction || "No hay datos de dinero sharp disponibles."}

═══ FORMA RECIENTE ═══
${context.homeForm && context.homeForm.length > 0 ? `${homeLabel}: ${context.homeForm.join("-")}` : `${homeLabel}: No disponible`}
${context.awayForm && context.awayForm.length > 0 ? `${awayLabel}: ${context.awayForm.join("-")}` : `${awayLabel}: No disponible`}

═══ ALINEACIONES / PITCHERS PROBABLES ═══
${context.starters || "No disponible"}

═══ ESTADISTICAS DE EQUIPOS ═══
${context.teamStats || "No disponible"}

═══ LESIONES ═══
${context.injuries || "No hay lesiones reportadas."}

═══ NOTICIAS RELEVANTES ═══
${context.headlines && context.headlines.length > 0 ? context.headlines.join("\n") : "Ninguna."}

═══ CONTEXTO DEL CAPPER ═══
${context.capperNotes || "Ninguno."}

${context.betTypePreference && context.betTypePreference !== "any" ? `PREFERENCIA DE MERCADO: ${context.betTypePreference}` : "Elige el mercado con mayor ventaja."}

Responde con esta estructura EXACTA:

**PICK:** [Apuesta especifica con linea, ej: "Bruins +1.5 (-110)"]
**CONFIANZA:** [Estandar / Fuerte / Top Play]
**UNIDADES:** [1-5, donde 5 = maxima confianza]

**ANALISIS:**
[3-5 oraciones usando los datos proporcionados. Cita estadisticas especificas de las secciones de datos. Explica por que la linea tiene valor.]

**IMPACTO DE LESIONES:**
[Como las lesiones afectan este partido especificamente. Si no hay lesiones, di que es neutral.]

**FACTOR CLAVE:**
[La razon #1 por la que esta apuesta tiene valor]

**RIESGO:**
[Que podria salir mal]

**MERCADOS ALTERNATIVOS:**
[Si hay valor en otros mercados, mencionalos. Si no, omite esta seccion.]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
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
