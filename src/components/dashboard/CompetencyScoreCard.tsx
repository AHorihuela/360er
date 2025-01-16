import { cn } from '@/lib/utils';
import { CORE_COMPETENCIES } from '@/lib/competencies';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AggregateScore } from './types';
import { MethodologyExplanation } from './MethodologyExplanation';
import { OutlierNotification } from './OutlierNotification';

interface CompetencyScoreCardProps {
  score: AggregateScore;
}

export function CompetencyScoreCard({ score }: CompetencyScoreCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full p-3 hover:bg-slate-50 transition-colors">
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{score.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{score.score.toFixed(1)}/5</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  score.confidence === 'high' && "bg-blue-100 text-blue-700",
                  score.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                  score.confidence === 'low' && "bg-red-100 text-red-700"
                )}>
                  {score.confidence}
                </span>
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className={cn(
                  "h-full transition-all",
                  score.confidence === 'high' && "bg-blue-500",
                  score.confidence === 'medium' && "bg-yellow-500",
                  score.confidence === 'low' && "bg-red-500"
                )}
                style={{ width: `${(score.score / 5) * 100}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="p-4">
          <div className="max-w-xs">
            <div className="space-y-1.5 mb-2">
              <h3 className="font-medium">{score.name}</h3>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  score.confidence === 'low' ? "bg-destructive/50" :
                  score.confidence === 'medium' ? "bg-yellow-500" :
                  "bg-primary"
                )} />
                <span className="text-sm">
                  Score: {score.score.toFixed(1)}/5.0
                  {score.hasOutliers && " (adjusted for outliers)"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {score.confidence} confidence based on {score.evidenceCount} pieces of evidence
              </p>
            </div>
            {score.evidenceQuotes && score.evidenceQuotes.length > 0 && (
              <div className="space-y-1 border-t pt-2">
                <p className="text-sm font-medium">Key Evidence:</p>
                <div className="space-y-1">
                  {score.evidenceQuotes.slice(0, 1).map((quote, i) => (
                    <p key={i} className="text-sm text-muted-foreground italic">"{quote}"</p>
                  ))}
                  {score.evidenceQuotes.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      +{score.evidenceQuotes.length - 1} more examples...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 