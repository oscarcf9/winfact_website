export type SamplePost = {
  slug: string;
  titleKey: string;
  category: "free_pick" | "game_preview" | "strategy" | "model_breakdown" | "news";
  sport: string[];
  excerpt: string;
  readingTime: number;
  publishedAt: string;
  author: string;
  featured?: boolean;
};

export const samplePosts: SamplePost[] = [
  {
    slug: "march-madness-2026-first-round-best-bets",
    titleKey: "March Madness 2026: First Round Best Bets and Model Edges",
    category: "free_pick",
    sport: ["NCAA"],
    excerpt:
      "Our model has identified significant CLV edges on three first-round matchups. Breaking down the key factors driving value in the opening round of the 2026 NCAA Tournament.",
    readingTime: 7,
    publishedAt: "2026-03-08",
    author: "WinFact Model",
    featured: true,
  },
  {
    slug: "nba-playoff-race-western-conference-preview",
    titleKey: "NBA Western Conference Playoff Race: Value Spots for the Final Stretch",
    category: "game_preview",
    sport: ["NBA"],
    excerpt:
      "With the NBA playoff picture tightening in the West, our model highlights three teams offering consistent closing line value as they battle for seeding down the stretch.",
    readingTime: 6,
    publishedAt: "2026-03-05",
    author: "WinFact Model",
    featured: true,
  },
  {
    slug: "understanding-closing-line-value-sports-betting",
    titleKey: "Understanding Closing Line Value: The Single Best Predictor of Long-Term Profit",
    category: "strategy",
    sport: ["MLB", "NFL", "NBA", "NHL"],
    excerpt:
      "CLV is the gold standard for measuring betting skill. Learn why consistently beating the closing line matters more than short-term results and how our model targets it.",
    readingTime: 10,
    publishedAt: "2026-02-28",
    author: "WinFact Model",
  },
  {
    slug: "nhl-model-breakdown-expected-goals-methodology",
    titleKey: "Inside the Model: How Expected Goals Power Our NHL Predictions",
    category: "model_breakdown",
    sport: ["NHL"],
    excerpt:
      "A deep dive into how we incorporate expected goals, high-danger scoring chances, and goaltender performance metrics to generate our NHL projections and identify market inefficiencies.",
    readingTime: 9,
    publishedAt: "2026-02-22",
    author: "WinFact Model",
  },
  {
    slug: "mlb-spring-training-2026-early-season-outlook",
    titleKey: "MLB 2026 Spring Training: Early-Season Win Total Edges and Futures Value",
    category: "news",
    sport: ["MLB"],
    excerpt:
      "Spring training is underway and our projections are locked in. Here are the teams where our model sees the biggest gaps between projected and posted win totals for the 2026 season.",
    readingTime: 8,
    publishedAt: "2026-02-18",
    author: "WinFact Model",
  },
  {
    slug: "champions-league-round-of-16-second-leg-picks",
    titleKey: "Champions League Round of 16: Second Leg Model Picks and Analysis",
    category: "free_pick",
    sport: ["Soccer"],
    excerpt:
      "Our soccer model breaks down the UCL Round of 16 second legs with a focus on aggregate scoreline projections, expected goals, and live value opportunities.",
    readingTime: 7,
    publishedAt: "2026-02-11",
    author: "WinFact Model",
  },
];
