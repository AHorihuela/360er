import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScoreWithOutlier } from './types';

interface CompetencySummaryCardProps {
  score: ScoreWithOutlier;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CompetencySummaryCard({ score, isExpanded, onToggle }: CompetencySummaryCardProps) {
  const getConfidenceTooltip = (confidence: 'low' | 'medium' | 'high', evidenceCount: number) => {
    switch (confidence) {
      case 'high':
        return `High confidence based on ${evidenceCount} pieces of evidence`;
      case 'medium':
        return `Medium confidence with ${evidenceCount} supporting examples`;
      case 'low':
        return `Limited evidence (${evidenceCount} examples) - interpret with caution`;
    }
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center justify-between mb-2",
          "cursor-pointer hover:bg-slate-50/80 -mx-4 px-4 py-2 rounded-sm",
          "transition-colors"
        )}
        onClick={onToggle}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{score.name}</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant={score.confidence === 'low' ? 'destructive' : 
                           score.confidence === 'medium' ? 'outline' : 
                           'secondary'}
                    className={cn(
                      "text-xs capitalize",
                      score.confidence === 'medium' && "bg-yellow-50 text-yellow-700",
                      score.confidence === 'high' && "bg-green-50 text-green-700"
                    )}
                  >
                    {score.confidence}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-sm">{getConfidenceTooltip(score.confidence, score.evidenceCount)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "transform rotate-180"
            )} />
          </div>
          <p className="text-sm text-muted-foreground">{score.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{score.score.toFixed(1)}/5.0</div>
          <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
            <span>{score.evidenceCount} pieces of evidence</span>
            {score.hasOutliers && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-sm">Some scores were adjusted to account for statistical outliers</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-2">
        <Progress 
          value={(score.score / 5) * 100} 
          className={cn(
            "h-2",
            score.confidence === 'low' ? "bg-destructive/10 [&>div]:bg-destructive/50" :
            score.confidence === 'medium' ? "bg-yellow-100 [&>div]:bg-yellow-500" :
            "bg-primary/10 [&>div]:bg-primary"
          )}
        />
        <div className="absolute inset-0 grid grid-cols-5 -mx-[1px]">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="border-l border-muted last:border-r" />
          ))}
        </div>
        <div className="absolute -bottom-4 left-[70%] w-0.5 h-2 bg-yellow-500">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground">
                  3.5
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-sm">Expected performance level</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
} 