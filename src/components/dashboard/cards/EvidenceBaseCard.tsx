import { TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScoreWithOutlier } from '../types';

interface EvidenceBaseCardProps {
  score: ScoreWithOutlier;
}

export function EvidenceBaseCard({ score }: EvidenceBaseCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-6 bg-background rounded-lg border relative group hover:border-green-200 transition-colors cursor-help">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-green-100 transform origin-left transition-transform duration-500 group-hover:scale-x-100" 
                 style={{ width: `${Math.min((score.evidenceCount / 50) * 100, 100)}%` }} />
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-green-50">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">Feedback Mentions</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{score.evidenceCount}</span>
                <span className="text-sm text-muted-foreground">pieces</span>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium">
                  {score.effectiveEvidenceCount.toFixed(1)}
                </span>
                effective evidence after weighting
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>The total number of specific mentions in feedback responses. Each mention is weighted based on its quality and source, resulting in an effective feedback score.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 