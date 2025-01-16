import { cn } from '@/lib/utils';
import { AggregateScore } from './types';

interface MethodologyExplanationProps {
  score: AggregateScore;
}

export function MethodologyExplanation({ score }: MethodologyExplanationProps) {
  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Score Weighting:</p>
        <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
            Senior feedback (40%): Strategic oversight and experience
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
            Peer feedback (35%): Day-to-day collaboration insights
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
            Junior feedback (25%): Upward management perspective
          </li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium">Confidence Impact:</p>
        <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
          <li className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-1.5 rounded-full font-medium",
              "bg-blue-100 text-blue-700"
            )}>high</span>
            100% weight - Strong evidence & consistency
          </li>
          <li className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-1.5 rounded-full font-medium",
              "bg-yellow-100 text-yellow-700"
            )}>medium</span>
            80% weight - Good evidence with some gaps
          </li>
          <li className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-1.5 rounded-full font-medium",
              "bg-red-100 text-red-700"
            )}>low</span>
            50% weight - Limited or inconsistent evidence
          </li>
        </ul>
      </div>

      {score.hasOutliers && (
        <div>
          <p className="text-sm font-medium">Outlier Handling:</p>
          <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0" />
              Extreme scores (greater than 3σ) reduced to 50% impact
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0" />
              Moderate outliers (2-3σ) reduced to 75% impact
            </li>
          </ul>
        </div>
      )}
    </div>
  );
} 