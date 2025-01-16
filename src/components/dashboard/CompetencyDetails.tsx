import React, { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoIcon, TrendingUp, Users, BarChart2, ChevronDown } from 'lucide-react';
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
  const detailsRef = useRef<HTMLDivElement>(null);
  const competencyKey = COMPETENCY_NAME_TO_KEY[score.name];
  const competency = competencyKey ? CORE_COMPETENCIES[competencyKey] : null;

  // Focus management for accessibility
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.focus();
    }
  }, []);

  // Helper function to get performance status
  const getPerformanceStatus = (score: number) => {
    if (score >= 4.0) return { 
      label: 'Significantly Exceeding', 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Strong performance with consistent excellence',
      icon: <TrendingUp className="h-5 w-5 text-green-500" />
    };
    if (score >= 3.5) return { 
      label: 'Exceeding Expectations', 
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      description: 'Performance above expected level',
      icon: <TrendingUp className="h-5 w-5 text-green-500" />
    };
    if (score >= 3.0) return { 
      label: 'Meeting Expectations', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Meeting basic role requirements',
      icon: <BarChart2 className="h-5 w-5 text-yellow-500" />
    };
    return { 
      label: 'Needs Improvement', 
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      description: 'Performance below expected level',
      icon: <ChevronDown className="h-5 w-5 text-red-500" />
    };
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
    <div 
      ref={detailsRef}
      tabIndex={-1}
      className="mt-4 pt-4 border-t space-y-6 focus:outline-none"
      role="region"
      aria-label={`Detailed analysis for ${score.name}`}
    >
      {/* Performance Overview Card */}
      <div className={cn(
        "p-6 rounded-lg border transition-colors",
        performance.bgColor
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {performance.icon}
              <h3 className={cn("text-lg font-semibold", performance.color)}>
                {performance.label}
              </h3>
            </div>
            <div className="text-2xl font-medium">
              {score.score.toFixed(1)}
              <span className="text-base text-muted-foreground">/5.0</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {performance.description}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(
              confidenceInfo.badge,
              "ml-2 flex items-center gap-1.5"
            )}
          >
            {confidenceInfo.icon}
            {score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)} Confidence
          </Badge>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress to Excellence</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            aria-label={`Progress to excellence: ${progressPercentage.toFixed(0)}%`}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Expected Level: 3.5</span>
            <span>Excellence: 5.0</span>
          </div>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Evidence Base */}
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Evidence Base</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold">
              {score.evidenceCount}
              <span className="text-base text-muted-foreground ml-1">pieces</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {score.effectiveEvidenceCount.toFixed(1)} effective evidence after weighting
            </p>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Score Distribution</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold">
              {score.confidenceMetrics?.factors.variance.toFixed(2)}
              <span className="text-base text-muted-foreground ml-1">variance</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {score.hasOutliers 
                ? "Some scores adjusted for outliers" 
                : "Consistent scoring across reviewers"}
            </p>
          </div>
        </div>

        {/* Relationship Coverage */}
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Relationship Coverage</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold">
              {(score.confidenceMetrics?.factors.relationshipCount || 0)}
              <span className="text-base text-muted-foreground ml-1">types</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Feedback from {score.confidenceMetrics?.factors.relationshipCount} different relationships
            </p>
          </div>
        </div>
      </div>

      {/* Current Level & Growth */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg border">
          <h3 className="text-sm font-medium mb-3">Current Performance Level</h3>
          <p className="text-sm text-muted-foreground">
            {competency?.rubric[Math.round(score.score)] || "Score description not available"}
          </p>
        </div>

        {score.score < 5.0 && (
          <div className="p-4 bg-background rounded-lg border">
            <h3 className="text-sm font-medium mb-3">Next Level Growth Areas</h3>
            <p className="text-sm text-muted-foreground">{getNextLevelGuidance(score.score)}</p>
          </div>
        )}
      </div>

      {/* Areas of Evaluation */}
      <div>
        <h3 className="text-sm font-medium mb-3">Areas of Evaluation</h3>
        <div className="grid grid-cols-2 gap-4">
          {competency?.aspects && (
            <>
              <div className="p-4 bg-background rounded-lg border">
                <ul className="space-y-2">
                  {competency.aspects.slice(0, Math.ceil(competency.aspects.length / 2)).map((aspect, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-foreground"></span>
                      {aspect}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <ul className="space-y-2">
                  {competency.aspects.slice(Math.ceil(competency.aspects.length / 2)).map((aspect, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-foreground"></span>
                      {aspect}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supporting Evidence */}
      {score.evidenceQuotes && score.evidenceQuotes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Supporting Evidence</h3>
          <div className="p-4 bg-background rounded-lg border space-y-3">
            {score.evidenceQuotes.slice(0, 3).map((quote, i) => (
              <div 
                key={i} 
                className="text-sm text-muted-foreground pl-3 border-l-2 border-muted"
              >
                "{quote}"
              </div>
            ))}
            {score.evidenceQuotes.length > 3 && (
              <div className="text-sm text-muted-foreground">
                +{score.evidenceQuotes.length - 3} more examples
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 