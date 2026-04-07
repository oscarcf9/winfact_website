import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function generateCommentary(
  game: {
    sport: string;
    league: string;
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    period: number;
    clock: string;
    situation: string;
  },
  recentCommentary: string[] = [],
  followUpContext: string = ""
): Promise<string> {
  // ~60% Spanish, ~40% English — matches bilingual group dynamics
  const language = Math.random() < 0.6 ? "spanish" : "english";

  const sportContext = getSportContext(game.sport, game.period);
  const scoreContext = buildScoreContext(game);
  const examples = getExamples(game.sport, language);

  // Randomly vary the commentary angle to prevent repetitiveness
  const angles = getAngles(game.situation, game.sport);
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const dedupBlock = recentCommentary.length > 0
    ? `\nRECENT MESSAGES YOU ALREADY POSTED (DO NOT repeat or paraphrase these):\n${recentCommentary.map((m) => `- "${m}"`).join("\n")}\n`
    : "";

  const langInstruction = language === "spanish"
    ? "IDIOMA: ESCRIBE COMPLETAMENTE EN ESPANOL. Estilo Miami/Caribe. No mezcles inglés."
    : "LANGUAGE: Write entirely in English. Sports Twitter style.";

  const prompt = `You are posting live game reactions in a Telegram sports group. You sound like the loudest, most passionate friend in the group chat — NOT a commentator, NOT a reporter, NOT a brand account.

LIVE GAME RIGHT NOW:
${game.team1} ${game.score1} @ ${game.team2} ${game.score2}
Sport: ${game.sport} (${game.league})
Period: ${sportContext}
Clock: ${game.clock}
What's happening: ${scoreContext}

${langInstruction}

YOUR ANGLE: ${angle}
${followUpContext}${dedupBlock}
RULES:
1. MAX 150 characters. Shorter is better. If you can say it in 80 characters, do it.
2. One thought per message. Never two sentences. Never a comma splice. Never "but" connecting two ideas.
3. ALL CAPS when something crazy happens — a big run, a lead change, a clutch play. Not every message, maybe 30% of them.
4. Use 1-2 emoji per message MAX. They punctuate the vibe, not decorate. 🔥💪👀😤💰 are your palette.
5. Be OPINIONATED. Take sides. Say a team looks trash. Say a player is cooking. Don't be neutral.
6. Never say "WinFact" or mention picks, bets, odds, units, models, or anything gambling-related.
7. Never use hashtags.
8. Sound like you're WATCHING the game right now, reacting in real time. Use present tense.
9. DO NOT use quotation marks in your output.
10. DO NOT add any preamble, label, or explanation. Output ONLY the message text.
11. Your output must be a single line, no line breaks.

BAD examples (NEVER DO THIS):
- "Dodgers jumped early but Bassitt's command looks sharp after that rough first" ← too long, compound sentence
- "Cleveland picked up the pace after halftime and Memphis can't keep up" ← two ideas joined, narrative style
- "The Knicks have completely flipped the script from that early sloppiness" ← descriptive, not reactive

${examples}

Generate ONLY the message. One line. Nothing else.`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 60,
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    // Safety: strip wrapping quotes, hashtags, and any preamble
    let comment = text
      .replace(/^["']|["']$/g, "")
      .replace(/^(Here'?s?|Sure|Okay|Got it)[^:]*:\s*/i, "")
      .replace(/#\w+/g, "")
      .replace(/\n/g, " ")
      .trim();

    // Hard limit: 150 chars, truncate at last complete word/emoji
    if (comment.length > 150) {
      const truncated = comment.substring(0, 150);
      const lastSpace = truncated.lastIndexOf(" ");
      comment = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
    }

    return comment;
  } catch (error) {
    console.error("[commentary] Claude API error:", error);
    return "";
  }
}

/**
 * Build a natural-language description of the score situation
 * so Claude doesn't have to do the math itself.
 */
function buildScoreContext(game: {
  sport: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number;
  situation: string;
}): string {
  const diff = Math.abs(game.score1 - game.score2);
  const leader = game.score1 > game.score2 ? game.team1 : game.team2;
  const trailer = game.score1 > game.score2 ? game.team2 : game.team1;
  const total = game.score1 + game.score2;
  const tied = game.score1 === game.score2;

  const parts: string[] = [];

  if (tied) {
    parts.push(`Tied game at ${game.score1}`);
  } else if (diff <= 3 && ["NBA", "NFL", "NHL"].includes(game.sport)) {
    parts.push(`${leader} barely holding on, up ${diff}`);
  } else if (diff >= 20) {
    parts.push(`${leader} absolutely destroying ${trailer} by ${diff}`);
  } else if (diff >= 15) {
    parts.push(`${leader} dominating ${trailer} by ${diff}`);
  } else {
    parts.push(`${leader} up ${diff} over ${trailer}`);
  }

  if (game.situation.includes("late")) {
    parts.push("late in the game");
  }
  if (game.situation.includes("high_scoring")) {
    parts.push(`${total} total points, high-scoring affair`);
  }

  return parts.join(". ") + ".";
}

/**
 * Sport-specific examples — short, punchy, hype-style.
 * Returns a random subset to prevent Claude from copying them verbatim.
 */
function getExamples(sport: string, language: string): string {
  const isSpanish = language === "spanish";

  const pools: Record<string, { en: string[]; es: string[] }> = {
    NBA: {
      en: [
        "Tatum going OFF in the 4th 🔥",
        "This pace is INSANE",
        "LeBron looks washed tonight ngl",
        "Luka can't miss from three 👀",
        "Bench mob came to play tonight",
        "JOKIC IS NOT HUMAN",
        "Hawks woke up from that bus ride 👀",
        "Celtics on a 15-0 run and the crowd is SILENT 😤",
        "Baltimore looks like a minor league team rn",
        "WHAT A PLAY",
      ],
      es: [
        "Los Heat no pueden anotar NADA 😤",
        "ESE BLOQUEO FUE CRIMINAL",
        "Miami corriendo la cancha como locos 💪",
        "Butler con la cara de 'yo no pedí esto'",
        "TRIPLE DOBLE Y APENAS ES EL TERCERO",
        "Celtics con un run de 15-0 y el estadio MUERTO 😤",
        "LOS CAVS CORRIENDO LA CANCHA 💪",
        "Minnesota presionando sin parar",
        "Este ritmo está BRUTAL 🔥",
        "YA COBRÓ ESE OVER 💰",
      ],
    },
    MLB: {
      en: [
        "This pitcher is DEALING 🔥",
        "Solo shot and the dugout went crazy",
        "Bullpen is cooked tonight",
        "That swing was VIOLENT 💪",
        "Defense just fell apart in the 7th",
        "Bassitt dealing right now 👀",
        "Grand slam on a 3-2 count 🔥",
        "Tied in the 9th, this is October energy",
        "Rookie with his first career homer",
        "5 errors in 4 innings, little league stuff",
      ],
      es: [
        "Ese swing fue pa la calle 👀",
        "EL ABRIDOR ESTÁ DOMINANDO",
        "Se ponchó con la recta al medio 😤",
        "Los bates se despertaron en la 6ta 🔥",
        "Cambio de pitcher y se fue todo al piso",
        "Este pitcheo está BRUTAL 🔥",
        "Jonrón de 3 carreras al center 💪",
        "Bases llenas sin out y no pudieron anotar 😤",
        "El bullpen colapsó en el 8vo",
        "Grand slam en conteo de 3-2, imposible",
      ],
    },
    NFL: {
      en: [
        "PICK SIX LET'S GOOOO 🔥",
        "That throw was INSANE",
        "Defense came to eat tonight 😤",
        "QB looks rattled in the pocket",
        "4th quarter comeback loading 👀",
        "Running game eating, 180 yards and counting",
        "Red zone INT, that's a backbreaker",
        "Fumble on the goal line 💀",
        "3 turnovers and only down 7 somehow",
        "OT energy is DIFFERENT",
      ],
      es: [
        "ESA JUGADA FUE DE OTRO MUNDO",
        "La defensa se los está comiendo 💪",
        "No pueden parar el juego terrestre",
        "INTERCEPTION EN LA ZONA ROJA 😤",
        "Este QB no aguanta la presión",
        "Pick six y se acabó esto 🔥",
        "Comeback en el 4to cuarto 👀",
        "El juego terrestre comiendo sin parar",
        "Fumble en la línea de gol 💀",
        "3 turnovers y solo pierden por 7",
      ],
    },
    NHL: {
      en: [
        "WHAT A SAVE 🔥",
        "This goalie is standing on his head",
        "Power play looking dangerous 👀",
        "3rd period energy is different",
        "That was the dirtiest dangle",
        "Empty net goal seals it",
        "Short-handed goal, embarrassing 💀",
        "Hat trick in the 2nd period 🧢",
        "Both goalies on fire tonight",
        "5-hole breakaway goal, goalie wants that back",
      ],
      es: [
        "El portero está volando esta noche 💪",
        "GOLAZO DE POWERPLAY",
        "Se puso 3-2 y esto se pone bueno 👀",
        "Este ritmo en el tercero está BRUTAL",
        "La defensa dejó solo al portero 😤",
        "Gol de red vacía y se acabó",
        "Hat trick en el segundo periodo 🧢",
        "Los dos goalies siendo murallas 🔥",
        "Gol shorthanded en contra, vergüenza",
        "Breakaway y la clavó por el 5-hole",
      ],
    },
    SOCCER: {
      en: [
        "GOLAZO FROM OUTSIDE THE BOX 🔥",
        "VAR checking everything tonight",
        "That cross was surgical 👀",
        "Keeper had no chance on that one",
        "Red card and it's OVER",
        "Counter attack goal, clinical 💪",
        "70% possession and nothing to show for it",
        "Stoppage time equalizer 😤",
        "3 goals in 5 minutes WHAT",
        "Parking the bus with 20 left",
      ],
      es: [
        "ESE GOL FUE DE OTRO PLANETA 🔥",
        "El VAR revisando todo esta noche 😤",
        "DAME MI AMBOS MARCAN 💪",
        "El portero se quedó mirando la pelota",
        "ROJA DIRECTA Y SE ACABÓ",
        "Gol de contragolpe de la nada 🔥",
        "70% de posesión y nada que mostrar",
        "Gol en tiempo de descuento 😤",
        "3 goles en 5 minutos QUE 👀",
        "Estacionando el bus con 20 minutos",
      ],
    },
  };

  const sportKey = ["LALIGA", "PREMIER", "LIGA_MX", "UCL"].includes(sport)
    ? "SOCCER"
    : sport;
  const pool = pools[sportKey] || pools.SOCCER;
  const langPool = isSpanish ? pool.es : pool.en;

  // Pick 4 random examples to prevent verbatim copying
  const shuffled = [...langPool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  return `GOOD examples (COPY THIS ENERGY, not these exact words):\n${selected.map((e) => `- "${e}"`).join("\n")}`;
}

/**
 * Commentary angles — gives Claude a specific lens for each comment
 * to prevent repetitive "this game is close" style messages.
 */
function getAngles(situation: string, sport: string): string[] {
  const base = [
    "React to the scoreboard — who's winning and how",
    "Who has the momentum right now",
    "Call out one team — are they cooking or trash?",
    "React to the energy or pace of the game",
  ];

  if (situation.includes("close_game")) {
    base.push(
      "The tension of this close game",
      "Who's going to pull it off",
      "Neither team can pull away",
    );
  }
  if (situation.includes("high_scoring")) {
    base.push(
      "React to how much scoring is happening",
      "Nobody playing defense tonight",
    );
  }
  if (situation.includes("blowout")) {
    base.push(
      "Roast the losing team",
      "The dominant team is on another level",
      "Garbage time vibes",
    );
  }
  if (situation.includes("late")) {
    base.push(
      "Clutch time — who steps up",
      "This is where games are won or lost",
    );
  }

  if (sport === "MLB") {
    base.push(
      "React to the pitching",
      "React to a big at-bat or play",
    );
  }
  if (sport === "NBA") {
    base.push(
      "Who's cooking on offense",
      "React to a run or scoring drought",
    );
  }

  return base;
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
