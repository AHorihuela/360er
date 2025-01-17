import { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, BarChart2, ChevronDown } from 'lucide-react';
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
            <span>Distance from Target (3.5)</span>
            <span>{Math.abs(score.score - 3.5).toFixed(1)} points {score.score >= 3.5 ? 'above' : 'below'}</span>
          </div>
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-0.5 h-full bg-slate-300" />
            </div>
            {score.score >= 3.5 ? (
              <div 
                className="absolute top-0 bottom-0 left-1/2 bg-green-500"
                style={{ width: `${((score.score - 3.5) / 1.5) * 50}%` }}
              />
            ) : (
              <div 
                className="absolute top-0 bottom-0 bg-red-500"
                style={{ 
                  right: '50%',
                  width: `${((3.5 - score.score) / 1.5) * 50}%`
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>-1.5</span>
            <span className="text-slate-500">Target (3.5)</span>
            <span>+1.5</span>
          </div>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Evidence Base */}
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
                  <span className="text-sm font-medium">Evidence Base</span>
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
              <p>The total number of feedback pieces received. Each piece is weighted based on its quality and relevance, resulting in an effective evidence count.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Score Distribution */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-6 bg-background rounded-lg border relative group hover:border-yellow-200 transition-colors cursor-help">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-yellow-100 transform origin-left transition-transform duration-500 group-hover:scale-x-100" 
                     style={{ width: `${Math.min((1 - (score.confidenceMetrics?.factors.variance || 0) / 5) * 100, 100)}%` }} />
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-full bg-yellow-50">
                    <BarChart2 className="h-4 w-4 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium">Score Distribution</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{score.confidenceMetrics?.factors.variance.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">variance</span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    {score.hasOutliers ? (
                      <>
                        <span className="inline-block px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded text-xs font-medium">
                          Adjusted
                        </span>
                        Some scores adjusted for outliers
                      </>
                    ) : (
                      <>
                        <span className="inline-block px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium">
                          Consistent
                        </span>
                        Consistent scoring across reviewers
                      </>
                    )}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>How consistently reviewers rated this competency. Lower variance means more agreement between reviewers. Outlier detection helps identify and adjust for unusually high or low scores.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Relationship Coverage */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-6 bg-background rounded-lg border relative group hover:border-blue-200 transition-colors cursor-help">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-100 transform origin-left transition-transform duration-500 group-hover:scale-x-100" 
                     style={{ width: `${((score.confidenceMetrics?.factors.relationshipCount || 0) / 3) * 100}%` }} />
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-full bg-blue-50">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">Relationship Coverage</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{(score.confidenceMetrics?.factors.relationshipCount || 0)}</span>
                    <span className="text-sm text-muted-foreground">of 3 types</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                      {Math.round(((score.confidenceMetrics?.factors.relationshipCount || 0) / 3) * 100)}% coverage
                    </span>
                    across different relationships
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Feedback diversity across three relationship types: senior colleagues, peers, and junior colleagues. Higher coverage means more balanced feedback from different perspectives.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Current Level & Growth */}
      <div className="grid grid-cols-2 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-6 bg-background rounded-lg border relative overflow-hidden cursor-help">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current Level</div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold text-blue-500">Level {Math.floor(score.score)}</h3>
                    <div className="text-sm text-muted-foreground">of 5</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {competency?.rubric[Math.floor(score.score)] || "Score description not available"}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Your current performance level based on aggregated feedback. Each level represents a distinct stage of competency development, from basic proficiency (Level 1) to exceptional mastery (Level 5).</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {score.score < 5.0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-6 bg-background rounded-lg border relative overflow-hidden cursor-help">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Next Level Target</div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold text-emerald-500">Level {Math.floor(score.score) + 1}</h3>
                      <div className="text-sm text-muted-foreground">of 5</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {competency?.rubric[Math.floor(score.score) + 1] || "Score description not available"}
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-blue-500">Current</span>
                        <span>Level {Math.floor(score.score)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-emerald-500">Target</span>
                        <span>Level {Math.floor(score.score) + 1}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ 
                            width: `${Math.min(((score.score - Math.floor(score.score)) * 100), 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          {Math.round((score.score - Math.floor(score.score)) * 100)}% progress to Level {Math.floor(score.score) + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Your next development target with a progress indicator showing how close you are to reaching the next level. The progress bar shows your advancement within your current level.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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