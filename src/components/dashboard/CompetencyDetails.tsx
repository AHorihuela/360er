import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';
import { ScoreWithOutlier } from './types';

interface CompetencyDetailsProps {
  score: ScoreWithOutlier;
}

export function CompetencyDetails({ score }: CompetencyDetailsProps) {
  const competencyKey = COMPETENCY_NAME_TO_KEY[score.name];
  const competency = competencyKey ? CORE_COMPETENCIES[competencyKey] : null;

  // Helper function to get indicator based on score
  const getIndicator = (score: number) => {
    if (score >= 4.0) return { symbol: '✓', color: "bg-green-100 text-green-700", text: 'Strong performance in this area' };
    if (score >= 3.5) return { symbol: '✓', color: "bg-green-100 text-green-600", text: 'Exceeding expectations' };
    if (score >= 3.0) return { symbol: '~', color: "bg-yellow-100 text-yellow-700", text: 'Meeting basic expectations' };
    return { symbol: '!', color: "bg-red-100 text-red-700", text: 'Area for improvement' };
  };

  const indicator = getIndicator(score.score);

  return (
    <div className="mt-4 pt-4 border-t space-y-6">
      {/* About Section with Key Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: About & Aspects */}
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium mb-2">About this Competency</h5>
            <div className="space-y-4">
              {/* Current Level Description */}
              <div className="p-3 bg-background rounded border">
                <div className="text-sm text-muted-foreground mb-1">Current Level Performance</div>
                <div className="text-sm">
                  {competency?.rubric[Math.round(score.score)] || 
                   "Score description not available"}
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Evaluation Criteria</div>
                <div className="space-y-2">
                  {competency?.aspects?.map((aspect, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 p-2 bg-background rounded border"
                    >
                      <div className="shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                                indicator.color
                              )}>
                                {indicator.symbol}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{indicator.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-sm">{aspect}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Overview */}
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium mb-2">Performance Overview</h5>
            <div className="grid gap-3">
              <div className="p-3 bg-background rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Score</div>
                    <div className="font-medium text-lg">{score.score.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Team average across all reviews</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Expected Level</div>
                    <div className="font-medium text-lg">3.5</div>
                    <div className="text-xs text-muted-foreground">Baseline for proficiency</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm mb-1 flex items-center gap-1">
                    <span className={cn(
                      "font-medium",
                      score.score >= 4.0 ? "text-green-700" :
                      score.score >= 3.5 ? "text-green-600" :
                      score.score >= 3.0 ? "text-yellow-600" :
                      "text-red-600"
                    )}>
                      {score.score >= 4.0 ? 'Significantly Exceeding' :
                       score.score >= 3.5 ? 'Exceeding' :
                       score.score >= 3.0 ? 'Approaching' :
                       'Below'} expectations
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <div className="space-y-2">
                            <p className="text-sm">Score ranges and their meanings:</p>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>4.0+: Significantly exceeding expectations</li>
                              <li>3.5-4.0: Exceeding expectations</li>
                              <li>3.5: Meeting expectations</li>
                              <li>3.0-3.5: Approaching expectations</li>
                              <li>Below 3.0: Needs improvement</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Progress 
                    value={(score.score / 5) * 100} 
                    className={cn(
                      "h-1.5",
                      score.score >= 4.0 ? "bg-green-100 [&>div]:bg-green-700" :
                      score.score >= 3.5 ? "bg-green-100 [&>div]:bg-green-600" :
                      score.score >= 3.0 ? "bg-yellow-100 [&>div]:bg-yellow-600" :
                      "bg-red-100 [&>div]:bg-red-600"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details */}
      <div>
        <h5 className="text-sm font-medium mb-3">Analysis Details</h5>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-background rounded border">
            <div className="text-sm text-muted-foreground">Confidence Level</div>
            <div className="font-medium capitalize flex items-center gap-2">
              {score.confidence}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {score.confidence === 'high' && "High confidence in this score"}
                        {score.confidence === 'medium' && "Moderate confidence in this score"}
                        {score.confidence === 'low' && "Limited confidence in this score"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {score.confidence === 'high' && "Based on consistent feedback across multiple relationships with strong supporting evidence"}
                        {score.confidence === 'medium' && "Based on moderate evidence with some variation in feedback patterns"}
                        {score.confidence === 'low' && "Limited by either the amount of evidence available or significant variations in feedback"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-3 bg-background rounded border">
            <div className="text-sm text-muted-foreground">Evidence Base</div>
            <div className="font-medium flex items-center gap-2">
              {score.evidenceCount >= 20 ? 'Strong' : 
               score.evidenceCount >= 10 ? 'Moderate' : 'Limited'}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {score.evidenceCount} specific examples found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {score.evidenceCount >= 20 ? 'A robust set of examples supporting this assessment' : 
                         score.evidenceCount >= 10 ? 'A good foundation of examples, but room for more evidence' : 
                         'Limited examples available - more evidence would strengthen this assessment'}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-3 bg-background rounded border">
            <div className="text-sm text-muted-foreground">Score Distribution</div>
            <div className="font-medium flex items-center gap-2">
              {score.hasOutliers ? 'High Variance' : 'Consistent'}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {score.hasOutliers ? 'Significant variation in scores' : 'Consistent scoring patterns'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {score.hasOutliers 
                          ? "Individual scores showed notable differences, suggesting varied experiences or perspectives" 
                          : "Reviewers generally agreed in their assessment of this competency"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Score Adjustments */}
      {score.hasOutliers && score.adjustmentDetails && (
        <div>
          <h5 className="text-sm font-medium mb-2">Score Adjustments</h5>
          <div className="space-y-2">
            {score.adjustmentDetails.map((detail, i) => (
              <div key={i} className="p-3 bg-background rounded border">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    {detail.adjustmentType === 'extreme' ? 'Major Adjustment' : 'Minor Adjustment'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {detail.relationship} feedback score of {detail.originalScore.toFixed(1)} was adjusted due to statistical variance
                  </span>
                </div>
              </div>
            ))}
            <p className="text-sm text-muted-foreground mt-2">
              Adjustments help maintain balanced scoring when feedback varies significantly from the average
            </p>
          </div>
        </div>
      )}

      {/* Methodology Note */}
      <div className="text-sm text-muted-foreground bg-slate-100 p-3 rounded">
        <p className="font-medium mb-2">How this score is calculated:</p>
        <ul className="list-disc pl-4 space-y-2">
          <li>
            <span className="font-medium">Relationship Weighting:</span>
            <ul className="mt-1 pl-4">
              <li>Senior feedback: 40% weight</li>
              <li>Peer feedback: 35% weight</li>
              <li>Junior feedback: 25% weight</li>
            </ul>
          </li>
          <li>
            <span className="font-medium">Statistical Adjustments:</span>
            {score.hasOutliers ? ' Applied to maintain scoring balance' : ' None needed'}
          </li>
          <li>
            <span className="font-medium">Confidence Assessment:</span> Based on evidence quantity ({score.evidenceCount} pieces) and feedback consistency
          </li>
        </ul>
      </div>
    </div>
  );
} 