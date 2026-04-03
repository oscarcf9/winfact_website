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
  recentCommentary: string[] = []
): Promise<string> {
  // ~60% Spanish, ~40% English , matches bilingual group dynamics
  const language = Math.random() < 0.6 ? "spanish" : "english";

  const sportContext = getSportContext(game.sport, game.period);
  const scoreContext = buildScoreContext(game);
  const sportPersonality = getSportPersonality(game.sport, language);
  const examples = getExamples(game.sport, language);

  // Randomly vary the commentary angle to prevent repetitiveness
  const angles = getAngles(game.situation, game.sport);
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const dedupBlock = recentCommentary.length > 0
    ? `\nRECENT MESSAGES YOU ALREADY POSTED (DO NOT repeat or paraphrase these):\n${recentCommentary.map((m) => `- "${m}"`).join("\n")}\n`
    : "";

  const prompt = `You are the voice of WinFact Picks , a sports analytics brand that posts in its community Telegram group during live games. You sound like the sports-obsessed friend in the group who always knows what's happening, NOT like a corporate account or a bot. You're watching the game and reacting naturally for your community , a mix of paid VIP members and free followers who trust WinFact's sports knowledge. Keep it real, keep it casual, but you represent a brand people respect.

LIVE GAME RIGHT NOW:
${game.team1} ${game.score1} @ ${game.team2} ${game.score2}
Sport: ${game.sport} (${game.league})
Period: ${sportContext}
Clock: ${game.clock}
What's happening: ${scoreContext}

Language: ${language}
${sportPersonality}

YOUR ANGLE FOR THIS COMMENT: ${angle}
${dedupBlock}
RULES , break any of these and the message gets thrown out:
- MAXIMUM 230 characters (hard limit, not a suggestion)
- Sound like a REAL PERSON texting, not a sportscaster or AI
- 1-2 emojis MAX, placed naturally (not at the start)
- React to what's ACTUALLY happening in the score , if a team is getting destroyed, say it. If it's a nail-biter, show it.
- Have a TAKE. Pick a side. Be opinionated. "This is a good game" is boring. "Celtics are cooking and nobody can stop Tatum" is real.
- DO NOT use hashtags
- DO NOT mention betting, picks, odds, spreads, lines, or anything gambling-related
- DO NOT use quotation marks in your output
- DO NOT use words like "currently", "right now", "at the moment", "as we speak"
- DO NOT start with "Wow" or "Oh my" or any generic exclamation
- DO NOT use the word "folks" or "friends" or address the group directly
- DO NOT add any preamble, label, or explanation, output ONLY the message text
- DO NOT use em dashes anywhere. Use commas, periods, or just separate thoughts naturally.
- Your output must be a single message, no line breaks

${examples}

Generate ONLY the message. One line. Nothing else.`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

    // Safety: strip wrapping quotes, hashtags, and any "Here's" preamble
    let comment = text
      .replace(/^["']|["']$/g, "")
      .replace(/^(Here'?s?|Sure|Okay|Got it)[^:]*:\s*/i, "")
      .replace(/#\w+/g, "")
      .replace(/\n/g, " ")
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
    parts.push(`${total} total points , high-scoring affair`);
  }

  return parts.join(". ") + ".";
}

/**
 * Sport-specific personality instructions that make the
 * commentary feel authentic to each sport's culture.
 */
function getSportPersonality(sport: string, language: string): string {
  const isSpanish = language === "spanish";

  switch (sport) {
    case "NBA":
      return isSpanish
        ? "WinFact sabe de NBA. Habla de runs, clutch shots, quien está en llamas. Usa jerga de basket: triple, doble-doble, and-one. Estilo Miami , mezcla español con algo de inglés cuando es natural. Habla como el analista del grupo que vive el basket."
        : "WinFact knows NBA. Talk about runs, who's cooking, who's cold. Use real basketball language , runs, buckets, cooking, ice cold. Sound like the sharpest basketball mind in the room, but keep it casual.";
    case "MLB":
      return isSpanish
        ? "WinFact sabe de baseball. Entiende innings, conteos, situaciones con corredores en base. Habla de pitchers dominando, bateadores clutch. Estilo caribeño , el beisbol está en la sangre de la comunidad."
        : "WinFact knows baseball. Talk about who's dealing on the mound, big at-bats, defensive plays. Appreciate the craft. Sound like someone who sees things others miss.";
    case "NFL":
      return isSpanish
        ? "WinFact sabe de football americano. Habla de drives, turnovers, el quarterback. Entiende downs y situaciones de red zone. Dale la perspectiva analítica pero con sabor latino."
        : "WinFact knows football. Talk about drives, red zone, clock management, momentum shifts. Sound like the person in the group who actually understands the play calls.";
    case "NHL":
      return isSpanish
        ? "WinFact sabe de hockey. Habla de powerplays, saves del goalie, goles increíbles. El hockey es rápido y WinFact lo entiende."
        : "WinFact knows hockey. Talk about power plays, goalie performance, momentum shifts. Sound informed but not like a broadcast , you're reacting in real time for your community.";
    default:
      // Soccer
      return isSpanish
        ? "WinFact sabe de fútbol. Habla de posesión, goles, tarjetas, tácticas. Si es un derbi o un clásico, sube la intensidad. El fútbol es pasión para la comunidad , refleja eso."
        : "WinFact knows soccer. Talk about possession, attacks, defensive shape. If it's a derby or big match, the intensity should be higher. Sound like the most knowledgeable person watching with your community.";
  }
}

/**
 * Sport-specific examples that demonstrate authentic voice.
 * Returns a random subset to prevent Claude from copying them verbatim.
 */
function getExamples(sport: string, language: string): string {
  const isSpanish = language === "spanish";

  const pools: Record<string, { en: string[]; es: string[] }> = {
    NBA: {
      en: [
        "Celtics on a 15-0 run and the crowd is SILENT 😬",
        "Jokic has 18 in the first half and he's not even trying that hard",
        "LeBron at 40 still doing this to people, unreal 🔥",
        "3rd quarter Warriors are a different animal, 12-0 run outta nowhere",
        "Both teams shooting 55% from three, this is a shootout",
        "Nobody playing defense in this one and honestly I'm not complaining",
        "Luka with the step-back triple and he just stared down the bench 💀",
        "Bench unit completely blowing this lead, painful to watch",
        "Down 18 and came all the way back, this is why we watch basketball 🏀",
        "They have zero answer for Embiid in the post, none",
      ],
      es: [
        "Celtics con un run de 15-0 y el público callado 😬",
        "Jokic con 18 en el primer tiempo sin sudar bro",
        "LeBron con 40 años haciéndole esto a la gente, increíble 🔥",
        "Warriors en el tercer cuarto son otro equipo, run de 12-0 de la nada",
        "Los dos tirando 55% de tres, esto es puro tiroteo",
        "Nadie defiende en este partido y honestamente no me quejo",
        "Luka con el step-back triple y se quedó mirando al banco 💀",
        "La banca regalando esta ventaja, que dolor",
        "Perdiendo por 18 y vinieron de atrás, por esto vemos basket 🏀",
        "No tienen respuesta para Embiid en el poste, ninguna",
      ],
    },
    MLB: {
      en: [
        "Pitcher is dealing , 7 Ks through 5 and the lineup looks lost",
        "Bases loaded nobody out and they couldn't score, brutal 😬",
        "3-run bomb to center, that ball is still flying",
        "7th inning and this starter hasn't broken 90 pitches, he's cruising",
        "Double play to end the inning, perfect time for it",
        "5 errors in 4 innings, this is little league stuff 💀",
        "Grand slam on a 3-2 count, you cannot script this 🔥",
        "Bullpen completely falling apart, 4 runs in the 8th",
        "Rookie with his first career homer and the dugout went crazy",
        "Tied in the 9th, this is what October baseball feels like",
      ],
      es: [
        "El pitcher dominando , 7 Ks en 5 innings y el lineup perdido",
        "Bases llenas sin out y no pudieron anotar, brutal 😬",
        "Jonrón de 3 carreras al center, esa bola todavía está volando",
        "7mo inning y el abridor no pasa de 90 pitcheos, va en crucero",
        "Doble play para cerrar el inning, justo cuando hacía falta",
        "5 errores en 4 innings, esto es pelota de barrio 💀",
        "Grand slam en conteo de 3-2, esto no se puede inventar 🔥",
        "El bullpen colapsó, 4 carreras en el 8vo",
        "El rookie con su primer jonrón y el dugout se volvió loco",
        "Empatados en el 9no, esto se siente como octubre",
      ],
    },
    NFL: {
      en: [
        "3 turnovers in the first half and they're still only down 7, somehow",
        "QB just scrambled for 25 yards on 3rd and long, kept the drive alive 🔥",
        "Defense is swarming every play, offense can't breathe",
        "Red zone INT, that's a backbreaker in a 3-point game",
        "4th quarter comeback brewing, 10 unanswered points",
        "Running game is eating , 180 yards and counting",
        "That was the worst play call I've seen all season 💀",
        "Pick six to make it a two-score game, this one's over",
        "Fumble on the goal line, you could hear the stadium groan",
        "OT rules are wild but I'm here for it, sudden death energy",
      ],
      es: [
        "3 turnovers en el primer tiempo y solo pierden por 7, cómo",
        "El QB corrió 25 yardas en 3rd and long, mantuvo el drive 🔥",
        "La defensa asfixiando cada jugada, la ofensiva sin aire",
        "INT en la red zone, eso duele cuando el juego está por 3",
        "Comeback en el 4to cuarto, 10 puntos sin respuesta",
        "El juego terrestre comiendo , 180 yardas y contando",
        "Esa fue la peor jugada que he visto en toda la temporada 💀",
        "Pick six para ponerlo a dos scores, se acabó esto",
        "Fumble en la línea de gol, se escuchó el estadio gemir",
        "Las reglas de overtime son locas pero aquí estamos, sudden death",
      ],
    },
    NHL: {
      en: [
        "Goalie just robbed that one-timer, save of the year candidate",
        "Power play goal and they made it look easy, crisp passing 🔥",
        "3rd period and they've completely taken over, relentless pressure",
        "5-hole goal on a breakaway, goalie wants that one back",
        "Both goalies standing on their heads tonight, elite performances",
        "Empty net goal seals it, pull the goalie they said",
        "Fight on the faceoff, hockey is wild 😂",
        "Tic-tac-toe passing play for the goal, that was beautiful",
        "Short-handed goal against, the power play unit should be embarrassed",
        "Hat trick in the 2nd period, hats are flying 🧢",
      ],
      es: [
        "El goalie acaba de robar ese one-timer, salvada del año",
        "Gol en powerplay y lo hicieron ver fácil, pases perfectos 🔥",
        "Tercer periodo y tomaron control total, presión sin parar",
        "Gol por el 5-hole en breakaway, el goalie quiere esa de vuelta",
        "Los dos goalies siendo murallas hoy, actuaciones de élite",
        "Gol de red vacía para sellar, dale saca al goalie dijeron",
        "Pelea en el faceoff, el hockey es una locura 😂",
        "Jugada de tic-tac-toe para el gol, eso fue arte",
        "Gol shorthanded en contra, la unidad de powerplay debería tener vergüenza",
        "Hat trick en el 2do periodo, están volando los gorros 🧢",
      ],
    },
    SOCCER: {
      en: [
        "They've had 70% possession and nothing to show for it",
        "Counter attack goal out of nowhere, clinical finish 🔥",
        "VAR checking for offside and everyone is holding their breath",
        "Keeper pulled off an insane double save, kept them in it",
        "Red card changes everything, playing with 10 for 30 minutes",
        "Free kick from 25 yards and he bent it perfectly into the top corner",
        "Parking the bus with 20 minutes left, classic defensive masterclass",
        "Stoppage time equalizer, the stadium is going absolutely insane",
        "3 goals in 5 minutes, this match completely flipped",
        "Clean sheet through 80 minutes and then it all fell apart 😬",
      ],
      es: [
        "70% de posesión y nada que mostrar, puro toque sin peligro",
        "Gol de contragolpe de la nada, definición clínica 🔥",
        "VAR revisando offside y todos aguantando la respiración",
        "El portero con doble atajada increíble, los mantuvo vivos",
        "Roja directa cambia todo, jugando con 10 por 30 minutos",
        "Tiro libre desde 25 metros y la clavó en el ángulo perfecto",
        "Estacionando el bus con 20 minutos, clase magistral defensiva",
        "Gol en tiempo de descuento para empatar, el estadio estalló",
        "3 goles en 5 minutos, este partido se volteó completamente",
        "Portería en cero por 80 minutos y después se desmoronó todo 😬",
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

  return `EXAMPLES of the tone and style (DO NOT copy these, use them as inspiration):\n${selected.map((e) => `- ${e}`).join("\n")}`;
}

/**
 * Commentary angles , gives Claude a specific lens for each comment
 * to prevent repetitive "this game is close" style messages.
 */
function getAngles(situation: string, sport: string): string[] {
  const base = [
    "React to the scoreboard , who's winning and how convincingly",
    "Focus on the momentum , who has it, who lost it",
    "Call out one team's performance , are they playing well or terrible?",
    "Comment on the pace or energy of the game",
  ];

  if (situation.includes("close_game")) {
    base.push(
      "Talk about the tension of a close game",
      "Speculate who's going to pull it off (without betting language)",
      "Point out that neither team can pull away",
    );
  }
  if (situation.includes("high_scoring")) {
    base.push(
      "React to how much scoring is happening",
      "Comment on the lack of defense",
      "Express excitement about the offensive fireworks",
    );
  }
  if (situation.includes("blowout")) {
    base.push(
      "Roast the losing team a little",
      "Express disbelief at how bad one team is playing",
      "Acknowledge the dominant team's performance",
      "Joke about the garbage time",
    );
  }
  if (situation.includes("late")) {
    base.push(
      "Talk about clutch time , who steps up?",
      "Comment on the pressure of the final stretch",
      "Note that this is where games are won or lost",
    );
  }

  if (sport === "MLB") {
    base.push(
      "Comment on the pitching matchup",
      "React to a specific batting situation",
    );
  }
  if (sport === "NBA") {
    base.push(
      "Talk about who's cooking on offense",
      "React to a team's run or scoring drought",
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
