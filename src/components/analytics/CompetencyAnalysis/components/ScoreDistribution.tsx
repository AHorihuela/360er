import { type ScoreWithOutlier } from "@/components/dashboard/types";

/**
 * Props for the ScoreDistribution component
 * @interface ScoreDistributionProps
 * @property {ScoreWithOutlier} score - The score to visualize
 */
interface ScoreDistributionProps {
  score: ScoreWithOutlier;
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
 * <ScoreDistribution score={competencyScore} />
 * ```
 */
export function ScoreDistribution({ score }: ScoreDistributionProps) {
  if (!score.scoreDistribution) return null;

  // Find the maximum count to scale the bars
  const maxCount = Math.max(...Object.values(score.scoreDistribution));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Score Distribution</div>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const count = score.scoreDistribution?.[value] || 0;
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={value} className="space-y-1">
              <div className="h-20 flex items-end">
                <div 
                  className="w-full bg-slate-200 rounded-t"
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium">{value}</div>
                <div className="text-xs text-muted-foreground">{count}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 