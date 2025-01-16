import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoIcon, TrendingUp, Users, BarChart2 } from 'lucide-react';
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

  // Get performance status
  const getPerformanceStatus = (score: number) => {
    if (score >= 4.0) return { label: 'Significantly Exceeding', color: 'text-green-600' };
    if (score >= 3.5) return { label: 'Exceeding Expectations', color: 'text-green-500' };
    if (score >= 3.0) return { label: 'Meeting Expectations', color: 'text-yellow-600' };
    return { label: 'Needs Improvement', color: 'text-red-500' };
  };

  const performance = getPerformanceStatus(score.score);
  const progressPercentage = (score.score / 5) * 100;

  // Get next level guidance
  const getNextLevelGuidance = (currentScore: number) => {
    const nextLevel = Math.min(5, Math.ceil(currentScore) + 1);
    return competency?.rubric[nextLevel] || '';
  };

  // Helper function to get confidence display info
  const getConfidenceInfo = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high':
        return {
          icon: <Users className="h-5 w-5 text-green-500" />,
          color: 'text-green-500',
          badge: 'bg-green-100 text-green-700',
          description: 'Based on consistent feedback across multiple relationships with strong supporting evidence'
        };
      case 'medium':
        return {
          icon: <Users className="h-5 w-5 text-yellow-500" />,
          color: 'text-yellow-500',
          badge: 'bg-yellow-100 text-yellow-700',
          description: 'Based on moderate evidence with some variation in feedback patterns'
        };
      case 'low':
        return {
          icon: <Users className="h-5 w-5 text-red-500" />,
          color: 'text-red-500',
          badge: 'bg-red-100 text-red-700',
          description: 'Limited by either the amount of evidence available or significant variations in feedback'
        };
    }
  };

  const confidenceInfo = getConfidenceInfo(score.confidence);

  return (
    <div className="mt-4 pt-4 border-t space-y-6">
      {/* Title section with confidence badge */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">{score.name}</h3>
        <Badge variant="secondary" className={cn(confidenceInfo.badge)}>
          {score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)}
        </Badge>
      </div>

      {/* About Section with Key Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: About & Aspects */}
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium mb-2">About this Competency</h5>
            <div className="space-y-4">
              {/* Enhanced Current Level Description */}
              <div className="space-y-3">
                <div className="p-3 bg-background rounded border">
                  <div className="text-sm text-muted-foreground mb-1">Current Level Performance</div>
                  <div className="text-sm">
                    {competency?.rubric[Math.round(score.score)] || 
                     "Score description not available"}
                  </div>
                </div>

                {score.score < 5.0 && (
                  <div className="p-3 bg-background rounded border">
                    <div className="text-sm text-muted-foreground mb-1">Path to Next Level</div>
                    <div className="text-sm">
                      {getNextLevelGuidance(score.score)}
                    </div>
                  </div>
                )}

                {score.evidenceQuotes && score.evidenceQuotes.length > 0 && (
                  <div className="p-3 bg-background rounded border">
                    <div className="text-sm text-muted-foreground mb-2">Supporting Evidence</div>
                    <div className="space-y-2">
                      {score.evidenceQuotes.slice(0, 2).map((quote, i) => (
                        <div key={i} className="text-sm italic text-muted-foreground pl-3 border-l-2">
                          "{quote}"
                        </div>
                      ))}
                      {score.evidenceQuotes.length > 2 && (
                        <div className="text-sm text-muted-foreground">
                          +{score.evidenceQuotes.length - 2} more examples
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
            <div className="p-4 bg-background rounded border space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">Current Score</div>
                  <div className="font-medium text-2xl">{score.score.toFixed(1)}</div>
                  <div className={cn("text-sm font-medium mt-1", performance.color)}>
                    {performance.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Expected Level</div>
                  <div className="font-medium text-2xl">3.5</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Baseline for proficiency
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to Excellence (5.0)</span>
                  <span>{progressPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Analysis Details */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-background rounded border">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Confidence Level</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="w-80">
                  <p className="font-medium mb-1">{score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)} Confidence Rating</p>
                  <p className="text-sm">Based on:</p>
                  <ul className="text-sm list-disc ml-4 mt-1">
                    <li>{score.evidenceCount} pieces of evidence</li>
                    {score.confidence === 'high' && (
                      <>
                        <li>Consistent feedback across reviewers</li>
                        <li>Multiple relationship perspectives</li>
                      </>
                    )}
                    {score.confidence === 'medium' && (
                      <>
                        <li>Some variation in feedback</li>
                        <li>Limited relationship perspectives</li>
                      </>
                    )}
                    {score.confidence === 'low' && (
                      <>
                        <li>High variation in feedback</li>
                        <li>Limited evidence or perspectives</li>
                      </>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {confidenceInfo.icon}
            <span className={cn("font-medium", confidenceInfo.color)}>
              {score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-background rounded border">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Evidence Base</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium mb-1">Strong Evidence Base</p>
                  <p className="text-sm">{score.evidenceCount} specific examples from feedback</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="font-medium">Strong</span>
            <span className="text-sm text-muted-foreground">
              ({score.evidenceCount} examples)
            </span>
          </div>
        </div>

        <div className="p-4 bg-background rounded border">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Score Distribution</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium mb-1">High Variance in Scores</p>
                  <p className="text-sm">Scores range significantly across reviews, indicating diverse perspectives on performance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">High Variance</span>
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