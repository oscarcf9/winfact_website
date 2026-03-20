const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://winfact-winfact-sports.aws-us-east-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function uid() {
  return "seed_" + Math.random().toString(36).substring(2, 15);
}

function iso(daysAgo, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function isoDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

const ADMIN_ID = "user_3AlEeeiVHUmwvtgmliFos8OxyID";

async function seed() {
  console.log("Seeding dummy data...\n");

  // ─── USERS (20 dummy members) ───
  const dummyUsers = [];
  const names = [
    ["Jake", "Miller", "en"], ["Maria", "Garcia", "es"], ["Tyler", "Johnson", "en"],
    ["Sofia", "Rodriguez", "es"], ["Chris", "Williams", "en"], ["Ana", "Martinez", "es"],
    ["Brandon", "Davis", "en"], ["Isabella", "Lopez", "es"], ["Derek", "Wilson", "en"],
    ["Carmen", "Hernandez", "es"], ["Ryan", "Anderson", "en"], ["Lucia", "Gonzalez", "es"],
    ["Kevin", "Thomas", "en"], ["Elena", "Perez", "es"], ["Marcus", "Brown", "en"],
    ["Valentina", "Sanchez", "es"], ["Jason", "Taylor", "en"], ["Camila", "Ramirez", "es"],
    ["Trevor", "Moore", "en"], ["Diana", "Torres", "es"],
  ];

  for (let i = 0; i < names.length; i++) {
    const [first, last, lang] = names[i];
    const id = `seed_user_${i + 1}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const refCode = `${first.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const daysAgo = Math.floor(Math.random() * 60) + 5;

    dummyUsers.push({ id, email, name: `${first} ${last}`, lang, refCode, daysAgo });

    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, name, role, language, referral_code, created_at, updated_at)
            VALUES (?, ?, ?, 'member', ?, ?, ?, ?)`,
      args: [id, email, `${first} ${last}`, lang, refCode, iso(daysAgo), iso(daysAgo)],
    });
  }
  console.log(`✓ ${names.length} dummy users`);

  // ─── SUBSCRIPTIONS ───
  const subPlans = [
    // 8 active VIP monthly
    ...dummyUsers.slice(0, 8).map((u, i) => ({
      userId: u.id, tier: "vip_monthly", status: "active", daysAgo: u.daysAgo,
    })),
    // 3 active VIP weekly
    ...dummyUsers.slice(8, 11).map((u) => ({
      userId: u.id, tier: "vip_weekly", status: "active", daysAgo: u.daysAgo,
    })),
    // 2 trialing
    ...dummyUsers.slice(11, 13).map((u) => ({
      userId: u.id, tier: "vip_monthly", status: "trialing", daysAgo: Math.min(u.daysAgo, 4),
    })),
    // 2 cancelled
    ...dummyUsers.slice(13, 15).map((u) => ({
      userId: u.id, tier: "vip_monthly", status: "cancelled", daysAgo: u.daysAgo,
    })),
    // 1 past_due
    { userId: dummyUsers[15].id, tier: "vip_monthly", status: "past_due", daysAgo: dummyUsers[15].daysAgo },
    // 1 season_pass
    { userId: dummyUsers[16].id, tier: "season_pass", status: "active", daysAgo: dummyUsers[16].daysAgo },
    // rest are free (no subscription row needed)
  ];

  for (const sub of subPlans) {
    const id = uid();
    const periodEnd = new Date();
    if (sub.status === "trialing") {
      periodEnd.setDate(periodEnd.getDate() + (7 - sub.daysAgo));
    } else if (sub.tier === "vip_weekly") {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else if (sub.tier === "season_pass") {
      periodEnd.setDate(periodEnd.getDate() + 120);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    await client.execute({
      sql: `INSERT OR IGNORE INTO subscriptions (id, user_id, stripe_subscription_id, tier, status, current_period_start, current_period_end, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, sub.userId, `sub_dummy_${id}`, sub.tier, sub.status, iso(sub.daysAgo), periodEnd.toISOString(), iso(sub.daysAgo)],
    });
  }
  console.log(`✓ ${subPlans.length} subscriptions`);

  // ─── PICKS (60 picks across 30 days, mixed sports) ───
  const matchups = [
    // NBA
    { sport: "NBA", league: "NBA", matchup: "Lakers vs Celtics", picks: ["Lakers -3.5", "Over 224.5", "Celtics ML"] },
    { sport: "NBA", league: "NBA", matchup: "Warriors vs Nuggets", picks: ["Warriors +5.5", "Under 228.5", "Nuggets -5.5"] },
    { sport: "NBA", league: "NBA", matchup: "Bucks vs 76ers", picks: ["Bucks -2.5", "Over 219.5", "76ers ML"] },
    { sport: "NBA", league: "NBA", matchup: "Suns vs Mavericks", picks: ["Suns -1.5", "Under 232.5"] },
    { sport: "NBA", league: "NBA", matchup: "Heat vs Knicks", picks: ["Heat +3.5", "Over 210.5"] },
    { sport: "NBA", league: "NBA", matchup: "Timberwolves vs Thunder", picks: ["Thunder -4.5", "Under 215.5"] },
    // MLB
    { sport: "MLB", league: "MLB", matchup: "Yankees vs Red Sox", picks: ["Yankees ML (-145)", "Over 8.5", "Red Sox +1.5"] },
    { sport: "MLB", league: "MLB", matchup: "Dodgers vs Padres", picks: ["Dodgers -1.5", "Under 7.5"] },
    { sport: "MLB", league: "MLB", matchup: "Astros vs Rangers", picks: ["Astros ML (-130)", "Over 9.0"] },
    { sport: "MLB", league: "MLB", matchup: "Braves vs Phillies", picks: ["Braves ML (-115)", "Under 8.0"] },
    // NHL
    { sport: "NHL", league: "NHL", matchup: "Bruins vs Rangers", picks: ["Bruins ML (-140)", "Under 5.5"] },
    { sport: "NHL", league: "NHL", matchup: "Oilers vs Avalanche", picks: ["Over 6.5", "Oilers ML (+110)"] },
    { sport: "NHL", league: "NHL", matchup: "Panthers vs Lightning", picks: ["Panthers -1.5", "Under 6.0"] },
    // Soccer
    { sport: "Soccer", league: "EPL", matchup: "Arsenal vs Liverpool", picks: ["Arsenal ML", "Under 2.5 Goals"] },
    { sport: "Soccer", league: "La Liga", matchup: "Barcelona vs Real Madrid", picks: ["Over 2.5 Goals", "Barcelona -0.5"] },
    { sport: "Soccer", league: "MLS", matchup: "Inter Miami vs LAFC", picks: ["Inter Miami ML", "Over 3.0 Goals"] },
  ];

  const confidences = ["top", "strong", "standard", "standard", "strong", "standard"];
  const tiers = ["vip", "vip", "vip", "free", "vip", "free"];
  const results = ["win", "win", "loss", "win", "push", "win", "loss", "win", "win", "loss"];
  let pickCount = 0;

  for (let day = 0; day < 30; day++) {
    // 2-3 matchups per day
    const dailyCount = day < 3 ? 3 : 2;
    for (let j = 0; j < dailyCount; j++) {
      const m = matchups[(day * 2 + j) % matchups.length];
      const pickText = m.picks[j % m.picks.length];
      const pickId = `pick_${day}_${j}`;
      const conf = confidences[(day + j) % confidences.length];
      const tier = tiers[(day + j) % tiers.length];
      const odds = [-110, -130, +120, -145, +105, -115, +140, -150][(day + j) % 8];
      const units = [1.0, 1.5, 2.0, 1.0, 2.5, 1.5][(day + j) % 6];
      const edge = +(Math.random() * 8 + 1).toFixed(1);

      const isSettled = day >= 1; // today's are published, rest settled
      const status = isSettled ? "settled" : "published";
      const result = isSettled ? results[(day + j) % results.length] : null;
      const closingOdds = isSettled ? odds + Math.floor(Math.random() * 20 - 10) : null;
      const clv = isSettled ? +(Math.random() * 6 - 1).toFixed(1) : null;

      const analysisEn = `Our model gives ${pickText} a ${edge}% edge based on recent form, matchup history, and line movement analysis. The ${m.matchup.split(" vs ")[0]} have been strong in this spot.`;
      const analysisEs = `Nuestro modelo da a ${pickText} una ventaja del ${edge}% basada en forma reciente, historial de enfrentamientos y análisis de movimiento de línea.`;

      await client.execute({
        sql: `INSERT OR IGNORE INTO picks (id, sport, league, matchup, pick_text, game_date, odds, units, model_edge, confidence, analysis_en, analysis_es, tier, status, result, closing_odds, clv, published_at, settled_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          pickId, m.sport, m.league, m.matchup, pickText, isoDate(day),
          odds, units, edge, conf, analysisEn, analysisEs, tier, status,
          result, closingOdds, clv,
          iso(day, 14), // published at 2pm UTC
          isSettled ? iso(day, 23) : null, // settled at 11pm UTC
          iso(day, 13), iso(day, 13),
        ],
      });
      pickCount++;
    }
  }
  console.log(`✓ ${pickCount} picks (across 30 days)`);

  // ─── DELIVERY QUEUE & LOGS ───
  let dqCount = 0;
  for (let day = 0; day < 15; day++) {
    for (let j = 0; j < 2; j++) {
      const pickId = `pick_${day}_${j}`;
      const tier = tiers[(day + j) % tiers.length];
      const channels = tier === "free"
        ? '["telegram_free","email"]'
        : '["telegram_vip","telegram_free","email"]';
      const dqId = uid();

      await client.execute({
        sql: `INSERT OR IGNORE INTO delivery_queue (id, pick_id, channels, tier, status, scheduled_for, processed_at, created_at)
              VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)`,
        args: [dqId, pickId, channels, tier, iso(day, 14), iso(day, 14), iso(day, 14)],
      });

      // Delivery logs for each channel
      const channelList = JSON.parse(channels);
      for (const ch of channelList) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO delivery_logs (id, pick_id, queue_id, channel, status, recipient_count, sent_at)
                VALUES (?, ?, ?, ?, 'sent', ?, ?)`,
          args: [uid(), pickId, dqId, ch, ch.includes("email") ? 15 : ch.includes("vip") ? 11 : 8, iso(day, 14)],
        });
      }
      dqCount++;
    }
  }
  console.log(`✓ ${dqCount} delivery queue entries + logs`);

  // ─── REFERRALS ───
  const referralData = [
    { referrerId: dummyUsers[0].id, email: dummyUsers[1].email, status: "converted", convertedAt: iso(20) },
    { referrerId: dummyUsers[0].id, email: dummyUsers[2].email, status: "converted", convertedAt: iso(15) },
    { referrerId: dummyUsers[0].id, email: dummyUsers[3].email, status: "converted", convertedAt: iso(10) },
    { referrerId: dummyUsers[0].id, email: "pending1@example.com", status: "pending", convertedAt: null },
    { referrerId: dummyUsers[4].id, email: dummyUsers[5].email, status: "converted", convertedAt: iso(12) },
    { referrerId: dummyUsers[4].id, email: "pending2@example.com", status: "pending", convertedAt: null },
    { referrerId: dummyUsers[8].id, email: dummyUsers[9].email, status: "converted", convertedAt: iso(8) },
    { referrerId: dummyUsers[8].id, email: dummyUsers[10].email, status: "converted", convertedAt: iso(5) },
    { referrerId: ADMIN_ID, email: dummyUsers[0].email, status: "converted", convertedAt: iso(30) },
    { referrerId: ADMIN_ID, email: dummyUsers[4].email, status: "converted", convertedAt: iso(25) },
    { referrerId: ADMIN_ID, email: "pending3@example.com", status: "pending", convertedAt: null },
  ];

  for (const ref of referralData) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO referrals (id, referrer_id, referred_email, status, reward_applied, converted_at, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)`,
      args: [uid(), ref.referrerId, ref.email, ref.status, ref.convertedAt, iso(35)],
    });
  }
  console.log(`✓ ${referralData.length} referrals`);

  // ─── POSTS ───
  const postData = [
    { slug: "lakers-celtics-showdown-preview", title: "Lakers vs Celtics: Showdown Preview", category: "game_preview", sport: "NBA", daysAgo: 1 },
    { slug: "why-our-model-loves-the-over", title: "Why Our Model Loves the Over Tonight", category: "model_breakdown", sport: "NBA", daysAgo: 3 },
    { slug: "mlb-opening-day-best-bets", title: "MLB Opening Day: Best Bets & Analysis", category: "free_pick", sport: "MLB", daysAgo: 5 },
    { slug: "bankroll-management-101", title: "Bankroll Management 101: The WinFact Way", category: "strategy", sport: null, daysAgo: 7 },
    { slug: "nhl-playoff-predictions-2026", title: "NHL Playoff Predictions 2026", category: "news", sport: "NHL", daysAgo: 10 },
    { slug: "el-clasico-betting-breakdown", title: "El Clásico: Barcelona vs Real Madrid Betting Breakdown", category: "game_preview", sport: "Soccer", daysAgo: 12 },
    { slug: "weekly-recap-march-w1", title: "Weekly Recap: March Week 1 Results", category: "model_breakdown", sport: null, daysAgo: 8 },
    { slug: "warriors-nuggets-nba-preview", title: "Warriors vs Nuggets: NBA Preview & Best Bets", category: "game_preview", sport: "NBA", daysAgo: 2 },
  ];

  for (const post of postData) {
    const bodyEn = `<h2>Game Analysis</h2><p>Our advanced analytics model has identified significant value in tonight's matchup. Here's a deep dive into the numbers and what they mean for your bets.</p><h3>Key Factors</h3><ul><li>Recent form trends strongly favor one side</li><li>Line movement suggests sharp money is coming in</li><li>Historical matchup data reveals an exploitable pattern</li></ul><p>After analyzing over 50 data points including player performance metrics, team efficiency ratings, and situational factors, our model has generated a clear edge.</p><h3>The Bottom Line</h3><p>This is exactly the type of spot our model excels at identifying. The combination of favorable matchup dynamics, line value, and situational edges creates a high-confidence opportunity.</p>`;
    const bodyEs = `<h2>Análisis del Partido</h2><p>Nuestro modelo de análisis avanzado ha identificado un valor significativo en el enfrentamiento de esta noche.</p><h3>Factores Clave</h3><ul><li>Las tendencias recientes favorecen claramente a un lado</li><li>El movimiento de líneas sugiere que el dinero inteligente está entrando</li></ul><p>Después de analizar más de 50 puntos de datos, nuestro modelo ha generado una ventaja clara.</p>`;

    const postId = uid();
    await client.execute({
      sql: `INSERT OR IGNORE INTO posts (id, slug, title_en, title_es, body_en, body_es, category, status, published_at, seo_title, seo_description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
      args: [
        postId, post.slug, post.title, post.title + " (ES)",
        bodyEn, bodyEs, post.category,
        iso(post.daysAgo, 10),
        post.title + " | WinFact Picks",
        `Read our expert analysis and data-driven breakdown of ${post.title.toLowerCase()}.`,
        iso(post.daysAgo, 9), iso(post.daysAgo, 9),
      ],
    });

    if (post.sport) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO post_tags (post_id, sport) VALUES (?, ?)`,
        args: [postId, post.sport],
      });
    }
  }
  console.log(`✓ ${postData.length} blog posts`);

  // ─── PROMO CODES ───
  const promos = [
    { code: "PICK80", type: "percent", value: 80, max: 500, current: 34 },
    { code: "VIP50", type: "percent", value: 50, max: 100, current: 12 },
    { code: "TRIAL14", type: "trial_days", value: 14, max: 200, current: 8 },
    { code: "LAUNCH20", type: "fixed", value: 20, max: 50, current: 50 },
  ];

  for (const p of promos) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO promo_codes (id, code, discount_type, discount_value, max_redemptions, current_redemptions, valid_from, valid_until, applicable_plans, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uid(), p.code, p.type, p.value, p.max, p.current,
        iso(60), iso(-90), // valid_from 60 days ago, valid_until 90 days from now
        '["vip_weekly","vip_monthly","season_pass"]',
        p.current < p.max ? 1 : 0,
        iso(60),
      ],
    });
  }
  console.log(`✓ ${promos.length} promo codes`);

  // ─── PERFORMANCE CACHE ───
  const perfData = [
    { scope: "all", period: "7d", wins: 14, losses: 6, pushes: 1, units: 6.8, roi: 12.4, clv: 2.3 },
    { scope: "all", period: "30d", wins: 42, losses: 22, pushes: 3, units: 15.2, roi: 9.1, clv: 1.8 },
    { scope: "all", period: "season", wins: 189, losses: 112, pushes: 14, units: 52.3, roi: 8.7, clv: 2.1 },
    { scope: "NBA", period: "7d", wins: 6, losses: 2, pushes: 0, units: 4.2, roi: 15.6, clv: 3.1 },
    { scope: "NBA", period: "30d", wins: 18, losses: 9, pushes: 1, units: 8.4, roi: 11.2, clv: 2.5 },
    { scope: "NBA", period: "season", wins: 82, losses: 48, pushes: 6, units: 24.1, roi: 9.8, clv: 2.2 },
    { scope: "MLB", period: "7d", wins: 4, losses: 2, pushes: 1, units: 1.5, roi: 7.1, clv: 1.2 },
    { scope: "MLB", period: "30d", wins: 12, losses: 7, pushes: 1, units: 3.8, roi: 6.5, clv: 1.5 },
    { scope: "MLB", period: "season", wins: 56, losses: 38, pushes: 5, units: 14.2, roi: 7.2, clv: 1.6 },
    { scope: "NHL", period: "7d", wins: 3, losses: 1, pushes: 0, units: 2.1, roi: 13.1, clv: 2.8 },
    { scope: "NHL", period: "30d", wins: 8, losses: 4, pushes: 0, units: 3.5, roi: 9.7, clv: 2.0 },
    { scope: "NHL", period: "season", wins: 35, losses: 18, pushes: 2, units: 10.8, roi: 10.5, clv: 2.4 },
    { scope: "Soccer", period: "7d", wins: 1, losses: 1, pushes: 0, units: -1.0, roi: -5.0, clv: 0.5 },
    { scope: "Soccer", period: "30d", wins: 4, losses: 2, pushes: 1, units: -0.5, roi: -1.2, clv: 0.8 },
    { scope: "Soccer", period: "season", wins: 16, losses: 8, pushes: 1, units: 3.2, roi: 5.1, clv: 1.1 },
  ];

  for (const p of perfData) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO performance_cache (id, scope, period, wins, losses, pushes, units_won, roi_pct, clv_avg, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [uid(), p.scope, p.period, p.wins, p.losses, p.pushes, p.units, p.roi, p.clv, iso(0)],
    });
  }
  console.log(`✓ ${perfData.length} performance cache entries`);

  // ─── REVENUE EVENTS ───
  const revEvents = [];
  for (let i = 0; i < 11; i++) {
    const user = dummyUsers[i];
    const tier = i < 8 ? "vip_monthly" : "vip_weekly";
    const amount = tier === "vip_monthly" ? 120 : 45;
    revEvents.push({ userId: user.id, type: "new_mrr", amount, tier, daysAgo: user.daysAgo, source: i < 3 ? "referral" : "organic" });
  }
  // Add some churn and expansion events
  revEvents.push({ userId: dummyUsers[13].id, type: "churn", amount: -120, tier: "vip_monthly", daysAgo: 5, source: "organic" });
  revEvents.push({ userId: dummyUsers[14].id, type: "churn", amount: -120, tier: "vip_monthly", daysAgo: 3, source: "organic" });
  revEvents.push({ userId: dummyUsers[7].id, type: "expansion", amount: 75, tier: "season_pass", daysAgo: 2, source: "organic" });

  for (const rev of revEvents) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO revenue_events (id, user_id, type, amount, tier, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [uid(), rev.userId, rev.type, rev.amount, rev.tier, rev.source, iso(rev.daysAgo)],
    });
  }
  console.log(`✓ ${revEvents.length} revenue events`);

  // ─── FINAL COUNTS ───
  console.log("\n--- Final counts ---");
  const tables = ["users", "subscriptions", "picks", "referrals", "posts", "post_tags", "promo_codes", "delivery_queue", "delivery_logs", "performance_cache", "revenue_events"];
  for (const t of tables) {
    const r = await client.execute("SELECT COUNT(*) as c FROM " + t);
    console.log(`  ${t}: ${r.rows[0].c}`);
  }

  console.log("\n✅ Seed complete!");
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
