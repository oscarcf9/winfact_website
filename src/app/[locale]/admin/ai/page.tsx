import { AIAssistant } from "@/components/admin/ai-assistant";

type Props = {
  searchParams: Promise<{
    tab?: string;
    sport?: string;
    matchup?: string;
    odds?: string;
    modelEdge?: string;
    sharpAction?: string;
    injuries?: string;
    lineHistory?: string;
  }>;
};

export default async function AdminAIPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <AIAssistant
      initialTab={params.tab}
      prefill={
        params.matchup
          ? {
              sport: params.sport,
              matchup: params.matchup,
              odds: params.odds,
              modelEdge: params.modelEdge,
              sharpAction: params.sharpAction,
              injuries: params.injuries,
              lineHistory: params.lineHistory,
            }
          : undefined
      }
    />
  );
}
