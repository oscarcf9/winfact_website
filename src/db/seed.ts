import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  // --- Admin User ---
  // WARNING: These values must match your Clerk user. Set them in .env, not here.
  const adminUserId = process.env.SEED_ADMIN_USER_ID;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!adminUserId || !adminEmail) {
    console.warn("  Skipping admin user — set SEED_ADMIN_USER_ID and SEED_ADMIN_EMAIL in .env");
  } else {
    await db.insert(schema.users).values({
      id: adminUserId,
      email: adminEmail,
      name: "WinFact Admin",
      role: "admin",
      language: "en",
      referralCode: "WINFACT-ADMIN",
    }).onConflictDoNothing();
    console.log("  Inserted admin user");
  }

  // --- Picks ---
  const samplePicks = [
    { id: "pick-001", sport: "MLB", league: "MLB", matchup: "Yankees vs Red Sox", pickText: "Yankees ML", odds: -135, units: 2, modelEdge: 7.4, confidence: "top" as const, analysisEn: "Pitching matchup heavily favors NYY. Boston bullpen used 5 arms yesterday. Market opened -120, moving toward NYY.", analysisEs: "El enfrentamiento de pitcheo favorece a NYY. El bullpen de Boston usó 5 brazos ayer. El mercado abrió en -120 y se mueve hacia NYY.", tier: "vip" as const, status: "settled" as const, result: "win" as const, closingOdds: -145, clv: 1.5, publishedAt: "2026-03-08T10:30:00Z", settledAt: "2026-03-08T22:00:00Z" },
    { id: "pick-002", sport: "MLB", league: "MLB", matchup: "Dodgers vs Padres", pickText: "Over 8.5", odds: -110, units: 1.5, modelEdge: 5.2, confidence: "strong" as const, analysisEn: "Both starters have high ERA in spring. Wind blowing out at Petco. Model projects 9.8 total runs.", analysisEs: "Ambos abridores tienen ERA alta en primavera. Viento a favor en Petco. El modelo proyecta 9.8 carreras totales.", tier: "vip" as const, status: "settled" as const, result: "win" as const, closingOdds: -120, clv: 1.8, publishedAt: "2026-03-07T11:00:00Z", settledAt: "2026-03-07T23:00:00Z" },
    { id: "pick-003", sport: "NBA", league: "NBA", matchup: "Lakers vs Celtics", pickText: "Celtics -4.5", odds: -110, units: 2, modelEdge: 6.1, confidence: "strong" as const, analysisEn: "Celtics 8-2 ATS at home vs Western teams. Lakers on B2B with travel. Sharp money on Boston.", analysisEs: "Celtics 8-2 ATS en casa vs equipos del Oeste. Lakers en B2B con viaje. Dinero sharp en Boston.", tier: "vip" as const, status: "settled" as const, result: "loss" as const, closingOdds: -105, clv: 0.8, publishedAt: "2026-03-07T12:00:00Z", settledAt: "2026-03-08T01:00:00Z" },
    { id: "pick-004", sport: "NFL", league: "NFL", matchup: "Chiefs vs Ravens", pickText: "Ravens +3", odds: -105, units: 2.5, modelEdge: 8.3, confidence: "top" as const, analysisEn: "Ravens defense ranks top-5 DVOA. Home field advantage not fully priced. Reverse line movement detected.", analysisEs: "La defensa de Ravens clasificada top-5 DVOA. Ventaja local no completamente valorada. Movimiento de línea inverso detectado.", tier: "vip" as const, status: "settled" as const, result: "win" as const, closingOdds: -110, clv: 2.1, publishedAt: "2026-02-01T10:00:00Z", settledAt: "2026-02-02T00:00:00Z" },
    { id: "pick-005", sport: "NHL", league: "NHL", matchup: "Rangers vs Bruins", pickText: "Under 5.5", odds: +105, units: 1.5, modelEdge: 4.8, confidence: "standard" as const, analysisEn: "Both goalies .930+ save pct last 10 games. Low xG matchup. Sharp under action confirmed.", analysisEs: "Ambos porteros con .930+ de salvadas en los últimos 10 juegos. Bajo xG en el encuentro.", tier: "free" as const, status: "settled" as const, result: "win" as const, closingOdds: -105, clv: 3.2, publishedAt: "2026-03-06T14:00:00Z", settledAt: "2026-03-06T23:00:00Z" },
    { id: "pick-006", sport: "Soccer", league: "EPL", matchup: "Arsenal vs Liverpool", pickText: "Arsenal ML", odds: +130, units: 1, modelEdge: 5.5, confidence: "strong" as const, analysisEn: "Arsenal xG advantage at home. Liverpool missing key midfielder. Market undervaluing home form.", analysisEs: "Ventaja de xG de Arsenal en casa. Liverpool sin mediocampista clave.", tier: "vip" as const, status: "settled" as const, result: "push" as const, closingOdds: +120, clv: 1.4, publishedAt: "2026-03-05T09:00:00Z", settledAt: "2026-03-05T18:00:00Z" },
    { id: "pick-007", sport: "NCAA", league: "NCAAB", matchup: "Duke vs UNC", pickText: "Duke -2.5", odds: -110, units: 2, modelEdge: 6.7, confidence: "strong" as const, analysisEn: "Duke KenPom efficiency edge. Transfer portal additions outperforming projections. Road fatigue for UNC.", analysisEs: "Ventaja de eficiencia KenPom para Duke. Adiciones del portal de transferencias superando proyecciones.", tier: "vip" as const, status: "settled" as const, result: "win" as const, closingOdds: -115, clv: 1.1, publishedAt: "2026-03-04T11:00:00Z", settledAt: "2026-03-04T23:30:00Z" },
    { id: "pick-008", sport: "NBA", league: "NBA", matchup: "Nuggets vs Suns", pickText: "Nuggets -6.5", odds: -110, units: 1.5, modelEdge: 4.2, confidence: "standard" as const, analysisEn: "Nuggets dominate at altitude. Suns on 4th game in 6 nights. Our pace model favors Denver.", analysisEs: "Nuggets dominan en altitud. Suns en su 4to juego en 6 noches. Nuestro modelo de ritmo favorece a Denver.", tier: "vip" as const, status: "published" as const, result: null, closingOdds: null, clv: null, publishedAt: "2026-03-09T10:30:00Z", settledAt: null },
    { id: "pick-009", sport: "MLB", league: "MLB", matchup: "Astros vs Mariners", pickText: "Astros -1.5", odds: +140, units: 1, modelEdge: 9.1, confidence: "top" as const, analysisEn: "Verlander vs. rookie starter. Astros lineup crushes lefties. Run line value at +140.", analysisEs: "Verlander vs. abridor novato. Lineup de Astros destruye zurdos. Valor en la línea de carreras a +140.", tier: "free" as const, status: "published" as const, result: null, closingOdds: null, clv: null, publishedAt: "2026-03-09T11:00:00Z", settledAt: null },
  ];

  for (const pick of samplePicks) {
    await db.insert(schema.picks).values(pick).onConflictDoNothing();
  }
  console.log(`  Inserted ${samplePicks.length} picks`);

  // --- Blog Posts ---
  const samplePosts = [
    { id: "post-001", slug: "march-madness-2026-first-round-best-bets", titleEn: "March Madness 2026: First Round Best Bets and Model Edges", titleEs: "March Madness 2026: Mejores Apuestas y Ventajas del Modelo en la Primera Ronda", bodyEn: "Our model has identified significant CLV edges on three first-round matchups. Breaking down the key factors driving value in the opening round of the 2026 NCAA Tournament.\n\nThe betting market for college basketball is among the least efficient of all major sports. With 68 teams in the field and limited public attention on mid-major conferences, there are consistent opportunities to find value against the closing line.\n\nOur multi-model consensus approach identified three games where our projected spreads differ significantly from the market...", bodyEs: "Nuestro modelo ha identificado ventajas significativas de CLV en tres enfrentamientos de la primera ronda...", category: "free_pick" as const, status: "published" as const, publishedAt: "2026-03-08T10:00:00Z", author: "WinFact Model" },
    { id: "post-002", slug: "nba-playoff-race-western-conference-preview", titleEn: "NBA Western Conference Playoff Race: Value Spots for the Final Stretch", titleEs: "Carrera de Playoffs del Oeste NBA: Oportunidades de Valor para la Recta Final", bodyEn: "With the NBA playoff picture tightening in the West, our model highlights three teams offering consistent closing line value as they battle for seeding down the stretch.\n\nAs the regular season enters its final month, the Western Conference playoff race is providing some of the best betting opportunities of the year...", bodyEs: "Con la carrera de playoffs del Oeste ajustándose, nuestro modelo destaca tres equipos con valor consistente...", category: "game_preview" as const, status: "published" as const, publishedAt: "2026-03-05T10:00:00Z", author: "WinFact Model" },
    { id: "post-003", slug: "understanding-closing-line-value-sports-betting", titleEn: "Understanding Closing Line Value: The Single Best Predictor of Long-Term Profit", titleEs: "Entendiendo el Valor de Línea de Cierre: El Mejor Predictor de Rentabilidad a Largo Plazo", bodyEn: "CLV is the gold standard for measuring betting skill. Learn why consistently beating the closing line matters more than short-term results and how our model targets it.\n\nIn the world of sports betting analytics, few metrics are as important as Closing Line Value...", bodyEs: "El CLV es el estándar de oro para medir la habilidad en apuestas. Aprende por qué superar consistentemente la línea de cierre importa más que los resultados a corto plazo...", category: "strategy" as const, status: "published" as const, publishedAt: "2026-02-28T10:00:00Z", author: "WinFact Model" },
    { id: "post-004", slug: "nhl-model-breakdown-expected-goals-methodology", titleEn: "Inside the Model: How Expected Goals Power Our NHL Predictions", titleEs: "Dentro del Modelo: Cómo los Goles Esperados Impulsan Nuestras Predicciones de NHL", bodyEn: "A deep dive into how we incorporate expected goals, high-danger scoring chances, and goaltender performance metrics to generate our NHL projections and identify market inefficiencies.\n\nExpected goals (xG) has become the premier analytical framework in hockey...", bodyEs: "Una inmersión profunda en cómo incorporamos goles esperados, oportunidades de gol de alto peligro y métricas de rendimiento de porteros...", category: "model_breakdown" as const, status: "published" as const, publishedAt: "2026-02-22T10:00:00Z", author: "WinFact Model" },
    { id: "post-005", slug: "mlb-spring-training-2026-early-season-outlook", titleEn: "MLB 2026 Spring Training: Early-Season Win Total Edges and Futures Value", titleEs: "MLB 2026 Spring Training: Ventajas en Totales de Victorias y Valor en Futuros", bodyEn: "Spring training is underway and our projections are locked in. Here are the teams where our model sees the biggest gaps between projected and posted win totals for the 2026 season.\n\nEvery February, the release of MLB win total lines creates one of the best opportunities of the year for sharp bettors...", bodyEs: "El entrenamiento de primavera está en marcha y nuestras proyecciones están listas. Aquí están los equipos donde nuestro modelo ve las mayores brechas...", category: "news" as const, status: "published" as const, publishedAt: "2026-02-18T10:00:00Z", author: "WinFact Model" },
    { id: "post-006", slug: "champions-league-round-of-16-second-leg-picks", titleEn: "Champions League Round of 16: Second Leg Model Picks and Analysis", titleEs: "Champions League Octavos de Final: Picks del Modelo y Análisis para la Vuelta", bodyEn: "Our soccer model breaks down the UCL Round of 16 second legs with a focus on aggregate scoreline projections, expected goals, and live value opportunities.\n\nThe Champions League knockout stages represent some of the most exciting betting opportunities in world football...", bodyEs: "Nuestro modelo de fútbol analiza las vueltas de octavos de final de la UCL con enfoque en proyecciones de marcador global...", category: "free_pick" as const, status: "published" as const, publishedAt: "2026-02-11T10:00:00Z", author: "WinFact Model" },
  ];

  for (const post of samplePosts) {
    await db.insert(schema.posts).values(post).onConflictDoNothing();
  }
  console.log(`  Inserted ${samplePosts.length} posts`);

  // --- Post Tags ---
  const postTagsData = [
    { postId: "post-001", sport: "NCAA" },
    { postId: "post-002", sport: "NBA" },
    { postId: "post-003", sport: "MLB" },
    { postId: "post-003", sport: "NFL" },
    { postId: "post-003", sport: "NBA" },
    { postId: "post-003", sport: "NHL" },
    { postId: "post-004", sport: "NHL" },
    { postId: "post-005", sport: "MLB" },
    { postId: "post-006", sport: "Soccer" },
  ];

  for (const tag of postTagsData) {
    await db.insert(schema.postTags).values(tag).onConflictDoNothing();
  }
  console.log(`  Inserted ${postTagsData.length} post tags`);

  // --- Performance Cache ---
  const performanceData = [
    { id: "perf-overall", scope: "overall", period: "all_time", wins: 847, losses: 691, pushes: 42, unitsWon: 187.3, roiPct: 8.7, clvAvg: 2.1 },
    { id: "perf-mlb", scope: "mlb", period: "all_time", wins: 234, losses: 189, pushes: 8, unitsWon: 52.4, roiPct: 9.2, clvAvg: 2.3 },
    { id: "perf-nfl", scope: "nfl", period: "all_time", wins: 156, losses: 132, pushes: 12, unitsWon: 38.7, roiPct: 8.1, clvAvg: 1.9 },
    { id: "perf-nba", scope: "nba", period: "all_time", wins: 198, losses: 167, pushes: 9, unitsWon: 41.2, roiPct: 7.8, clvAvg: 2.0 },
    { id: "perf-nhl", scope: "nhl", period: "all_time", wins: 112, losses: 89, pushes: 6, unitsWon: 28.9, roiPct: 10.4, clvAvg: 2.4 },
    { id: "perf-soccer", scope: "soccer", period: "all_time", wins: 78, losses: 62, pushes: 4, unitsWon: 15.1, roiPct: 7.2, clvAvg: 1.7 },
    { id: "perf-ncaa", scope: "ncaa", period: "all_time", wins: 69, losses: 52, pushes: 3, unitsWon: 11.0, roiPct: 6.8, clvAvg: 1.6 },
    // Monthly performance
    { id: "perf-m-oct25", scope: "overall", period: "2025-10", wins: 89, losses: 71, pushes: 5, unitsWon: 21.3, roiPct: 9.1, clvAvg: 2.2 },
    { id: "perf-m-nov25", scope: "overall", period: "2025-11", wins: 95, losses: 82, pushes: 6, unitsWon: 15.7, roiPct: 6.4, clvAvg: 1.8 },
    { id: "perf-m-dec25", scope: "overall", period: "2025-12", wins: 78, losses: 63, pushes: 4, unitsWon: 18.9, roiPct: 8.8, clvAvg: 2.3 },
    { id: "perf-m-jan26", scope: "overall", period: "2026-01", wins: 82, losses: 69, pushes: 7, unitsWon: 16.4, roiPct: 7.5, clvAvg: 2.0 },
    { id: "perf-m-feb26", scope: "overall", period: "2026-02", wins: 91, losses: 74, pushes: 5, unitsWon: 22.1, roiPct: 9.8, clvAvg: 2.4 },
    { id: "perf-m-mar26", scope: "overall", period: "2026-03", wins: 45, losses: 37, pushes: 3, unitsWon: 10.2, roiPct: 8.3, clvAvg: 2.1 },
  ];

  for (const perf of performanceData) {
    await db.insert(schema.performanceCache).values(perf).onConflictDoNothing();
  }
  console.log(`  Inserted ${performanceData.length} performance cache entries`);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
