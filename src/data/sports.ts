export const sports = [
  {
    slug: "mlb",
    name: "MLB",
    icon: "CircleDot",
    color: "#C41E3A",
    leagues: ["MLB"],
  },
  {
    slug: "nfl",
    name: "NFL",
    icon: "Football",
    color: "#013369",
    leagues: ["NFL"],
  },
  {
    slug: "nba",
    name: "NBA",
    icon: "Dribbble",
    color: "#C9082A",
    leagues: ["NBA"],
  },
  {
    slug: "nhl",
    name: "NHL",
    icon: "Snowflake",
    color: "#000000",
    leagues: ["NHL"],
  },
  {
    slug: "soccer",
    name: "Soccer",
    icon: "Goal",
    color: "#00A550",
    leagues: ["MLS", "EPL", "La Liga", "UCL"],
  },
  {
    slug: "ncaa",
    name: "NCAA",
    icon: "GraduationCap",
    color: "#1B3C73",
    leagues: ["NCAAF", "NCAAB"],
  },
] as const;

export type Sport = (typeof sports)[number];
export type SportSlug = Sport["slug"];
