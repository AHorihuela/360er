import { type ScoreWithOutlier } from "@/components/dashboard/types";
import { CompetencyCard } from "./CompetencyCard";

interface CompetencyScoreCardsProps {
  scores: ScoreWithOutlier[];
}

export function CompetencyScoreCards({ scores }: CompetencyScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {scores.map(score => (
        <CompetencyCard key={score.name} score={score} />
      ))}
    </div>
  );
} 