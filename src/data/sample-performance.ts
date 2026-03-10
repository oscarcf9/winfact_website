export type PerformanceRecord = {
  sport: string;
  wins: number;
  losses: number;
  pushes: number;
  unitsWon: number;
  roi: number;
  avgClv: number;
};

export type MonthlyRecord = {
  month: string;
  wins: number;
  losses: number;
  unitsWon: number;
  roi: number;
};

export type OverallPerformance = {
  wins: number;
  losses: number;
  pushes: number;
  unitsWon: number;
  roi: number;
  avgClv: number;
};

export const overallPerformance: OverallPerformance = {
  wins: 847,
  losses: 691,
  pushes: 42,
  unitsWon: 187.3,
  roi: 8.7,
  avgClv: 2.1,
};

export const sportPerformance: PerformanceRecord[] = [
  { sport: "MLB", wins: 234, losses: 189, pushes: 8, unitsWon: 52.4, roi: 9.2, avgClv: 2.3 },
  { sport: "NFL", wins: 156, losses: 132, pushes: 12, unitsWon: 38.7, roi: 8.1, avgClv: 1.9 },
  { sport: "NBA", wins: 198, losses: 167, pushes: 9, unitsWon: 41.2, roi: 7.8, avgClv: 2.0 },
  { sport: "NHL", wins: 112, losses: 89, pushes: 6, unitsWon: 28.9, roi: 10.4, avgClv: 2.4 },
  { sport: "Soccer", wins: 78, losses: 62, pushes: 4, unitsWon: 15.1, roi: 7.2, avgClv: 1.7 },
  { sport: "NCAA", wins: 69, losses: 52, pushes: 3, unitsWon: 11.0, roi: 6.8, avgClv: 1.6 },
];

export const monthlyPerformance: MonthlyRecord[] = [
  { month: "Oct 2025", wins: 89, losses: 71, unitsWon: 21.3, roi: 9.1 },
  { month: "Nov 2025", wins: 95, losses: 82, unitsWon: 15.7, roi: 6.4 },
  { month: "Dec 2025", wins: 78, losses: 63, unitsWon: 18.9, roi: 8.8 },
  { month: "Jan 2026", wins: 82, losses: 69, unitsWon: 16.4, roi: 7.5 },
  { month: "Feb 2026", wins: 91, losses: 74, unitsWon: 22.1, roi: 9.8 },
  { month: "Mar 2026", wins: 45, losses: 37, unitsWon: 10.2, roi: 8.3 },
];
