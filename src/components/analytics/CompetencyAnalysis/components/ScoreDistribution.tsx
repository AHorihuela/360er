import { type CompetencyScore } from '../hooks/useCompetencyScores';

interface ScoreDistributionProps {
  scores: CompetencyScore[];
}

export function ScoreDistribution({ scores }: ScoreDistributionProps) {
  // Calculate score distribution (1-5 scale)
  const distribution = scores.reduce((acc, score) => {
    const roundedScore = Math.round(score.score);
    acc[roundedScore] = (acc[roundedScore] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Find the maximum count for scaling
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Score Distribution</h4>
      <div className="grid grid-cols-5 gap-1 h-24">
        {[1, 2, 3, 4, 5].map(score => {
          const count = distribution[score] || 0;
          const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={score} className="flex flex-col items-center justify-end">
              <div 
                className="w-full bg-primary/20 rounded-t"
                style={{ height: `${heightPercentage}%` }}
              />
              <div className="text-xs text-muted-foreground mt-1">{score}</div>
              <div className="text-xs text-muted-foreground">{count}</div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-center text-muted-foreground">
        Score Range
      </div>
    </div>
  );
} 