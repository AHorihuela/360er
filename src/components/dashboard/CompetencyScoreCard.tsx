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
            <div className="space-y-1.5 mb-4">
              <h3 className="font-medium">{score.name}</h3>
              <span className={cn(
                "inline-block text-xs px-2 py-0.5 rounded-full font-medium",
                score.confidence === 'high' && "bg-blue-100 text-blue-700",
                score.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                score.confidence === 'low' && "bg-red-100 text-red-700"
              )}>
                {score.confidence} confidence
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Score: {score.score.toFixed(1)}/5
                <br />
                Based on {score.evidenceCount} pieces of evidence
                <OutlierNotification score={score} />
              </p>
              
              <MethodologyExplanation score={score} />
            </div>

            {Object.values(CORE_COMPETENCIES).find(comp => comp.name === score.name) && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Key Aspects:</h4>
                <ul className="space-y-1">
                  {Object.values(CORE_COMPETENCIES)
                    .find(comp => comp.name === score.name)?.aspects
                    .map((aspect, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {aspect}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 