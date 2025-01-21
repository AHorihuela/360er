import { type CompetencyScore } from '../hooks/useCompetencyScores';

/**
 * Props for the ScoreDistribution component
 * @interface ScoreDistributionProps
 * @property {CompetencyScore[]} scores - Array of scores to visualize
 */
interface ScoreDistributionProps {
  scores: CompetencyScore[];
}

/**
 * ScoreDistribution visualizes the distribution of scores on a 1-5 scale.
 * 
 * Features:
 * - Shows bar chart of score frequencies
 * - Automatically scales based on maximum count
 * - Displays count for each score level
 * - Handles empty data gracefully
 * 
 * @component
 * @example
 * ```tsx
 * <ScoreDistribution scores={competencyScores} />
 * ```
 */
export function ScoreDistribution({ scores }: ScoreDistributionProps) {
  // Calculate score distribution (1-5 scale)
  const distribution = scores.reduce((acc, score) => {
    const roundedScore = Math.round(score.score);
    acc[roundedScore] = (acc[roundedScore] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Find the maximum count for scaling the bars
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