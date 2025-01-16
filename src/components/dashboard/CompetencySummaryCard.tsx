import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Info, AlertCircle } from 'lucide-react';
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

function getScoreColor(score: number) {
  if (score >= 4.0) return '[&>div]:bg-emerald-500';
  if (score >= 3.5) return '[&>div]:bg-blue-500';
  if (score >= 3.0) return '[&>div]:bg-yellow-500';
  if (score >= 2.5) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
}

function getScoreBgColor(score: number) {
  if (score >= 4.0) return 'bg-emerald-100';
  if (score >= 3.5) return 'bg-blue-100';
  if (score >= 3.0) return 'bg-yellow-100';
  if (score >= 2.5) return 'bg-orange-100';
  return 'bg-red-100';
}

function getConfidenceOpacity(confidence: 'low' | 'medium' | 'high') {
  switch (confidence) {
    case 'high': return '[&>div]:opacity-100';
    case 'medium': return '[&>div]:opacity-70';
    case 'low': return '[&>div]:opacity-40';
  }
}

export function CompetencySummaryCard({ score, isExpanded, onToggle }: CompetencySummaryCardProps) {
  const getConfidenceTooltip = (confidence: 'low' | 'medium' | 'high', evidenceCount: number, effectiveEvidenceCount: number, hasOutliers: boolean) => {
    let explanation = `${evidenceCount} total mentions → ${effectiveEvidenceCount} effective evidence (after applying diminishing returns)`;
    
    if (confidence === 'low') {
      explanation += '. More diverse feedback sources needed.';
    }

    if (hasOutliers) {
      explanation += '\n\nSome scores were adjusted to account for statistical outliers.';
    }

    return explanation;
  };

  const scoreColor = getScoreColor(score.score);
  const scoreBgColor = getScoreBgColor(score.score);
  const confidenceOpacity = getConfidenceOpacity(score.confidence);

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
            <span>{score.effectiveEvidenceCount} effective pieces of evidence</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className={cn(
                    "h-4 w-4 hover:text-foreground transition-colors",
                    score.hasOutliers ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[300px] whitespace-pre-line">
                  <p className="text-sm">{getConfidenceTooltip(
                    score.confidence, 
                    score.evidenceCount, 
                    score.effectiveEvidenceCount, 
                    score.hasOutliers ?? false
                  )}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="relative mt-2">
        <Progress 
          value={(score.score / 5) * 100} 
          className={cn(
            "h-2",
            scoreBgColor,
            scoreColor,
            confidenceOpacity
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