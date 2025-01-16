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
    if (score >= 4.0) return { label: 'Significantly Exceeding', color: 'text-green-600', description: 'Strong performance with consistent excellence' };
    if (score >= 3.5) return { label: 'Exceeding Expectations', color: 'text-green-500', description: 'Performance above expected level' };
    if (score >= 3.0) return { label: 'Meeting Expectations', color: 'text-yellow-600', description: 'Meeting basic role requirements' };
    return { label: 'Needs Improvement', color: 'text-red-500', description: 'Performance below expected level' };
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
      {/* Score Overview - Most important information first */}
      <div className="p-4 bg-background rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-2xl font-medium">{score.score.toFixed(1)}<span className="text-base text-muted-foreground">/5.0</span></div>
            <div className={cn("text-sm font-medium", performance.color)}>
              {performance.label}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {performance.description}
            </div>
          </div>
          <Badge variant="secondary" className={cn(confidenceInfo.badge, "ml-2")}>
            {score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)} Confidence
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress to Excellence</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Expected Level: 3.5</span>
            <span>Excellence: 5.0</span>
          </div>
        </div>
      </div>

      {/* Key Insights - Clear summary of performance */}
      <div className="space-y-4">
        <div className="p-4 bg-background rounded-lg border">
          <h3 className="text-sm font-medium mb-2">Current Performance</h3>
          <p className="text-sm">
            {competency?.rubric[Math.round(score.score)] || "Score description not available"}
          </p>
        </div>

        {score.score < 5.0 && (
          <div className="p-4 bg-background rounded-lg border">
            <h3 className="text-sm font-medium mb-2">Growth Opportunity</h3>
            <p className="text-sm">{getNextLevelGuidance(score.score)}</p>
          </div>
        )}
      </div>

      {/* Analysis Details - More detailed information */}
      <div>
        <h3 className="text-sm font-medium mb-3">Analysis Details</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Evidence Base */}
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">{score.evidenceCount} Examples</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Strong evidence base from multiple reviewers
            </p>
          </div>

          {/* Score Distribution */}
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Score Variance</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {score.hasOutliers 
                ? "Diverse perspectives with some variation in scores" 
                : "Consistent scoring across reviewers"}
            </p>
          </div>

          {/* Methodology */}
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <InfoIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Calculation Method</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Weighted by relationship:
              <ul className="mt-1 space-y-1">
                <li>• Senior (40%)</li>
                <li>• Peer (35%)</li>
                <li>• Junior (25%)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Areas of Evaluation */}
      <div>
        <h3 className="text-sm font-medium mb-3">Areas of Evaluation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg border">
            <ul className="space-y-2">
              {competency?.aspects?.slice(0, 3).map((aspect, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-foreground"></span>
                  {aspect}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <ul className="space-y-2">
              {competency?.aspects?.slice(3).map((aspect, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-foreground"></span>
                  {aspect}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Supporting Evidence */}
      {score.evidenceQuotes && score.evidenceQuotes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Supporting Evidence</h3>
          <div className="p-4 bg-background rounded-lg border space-y-3">
            {score.evidenceQuotes.slice(0, 2).map((quote, i) => (
              <div key={i} className="text-sm text-muted-foreground pl-3 border-l-2">
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
  );
} 