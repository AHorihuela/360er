import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { MIN_REVIEWS_REQUIRED, RELATIONSHIP_WEIGHTS, CONFIDENCE_WEIGHTS, COMPETENCY_ORDER } from '@/components/dashboard/constants';
import { detectOutliers, calculateConfidence } from '@/components/dashboard/utils';
import { CompetencySummaryCard } from '@/components/dashboard/CompetencySummaryCard';
import { CompetencyDetails } from '@/components/dashboard/CompetencyDetails';
import { TeamSummaryStats } from '@/components/dashboard/TeamSummaryStats';
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';
import { cn } from "@/lib/utils";
import { type ScoreWithOutlier } from '@/components/dashboard/types';
import { type CompetencyFilters } from '@/types/analytics';

interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  title?: string;
  subtitle?: string;
  showTeamStats?: boolean;
  filters?: CompetencyFilters;
}

export function CompetencyAnalysis({ 
  feedbackRequests,
  title = "Team Competency Analysis",
  subtitle,
  showTeamStats = true,
  filters
}: CompetencyAnalysisProps) {
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

  // Add ref for scrolling
  const competencyRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleCompetencyToggle = (name: string, isCurrentlyExpanded: boolean) => {
    setExpandedCompetency(isCurrentlyExpanded ? null : name);
    
    // If expanding, scroll the section into view
    if (!isCurrentlyExpanded && competencyRefs.current[name]) {
      competencyRefs.current[name]?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Memoize the competency score calculations
  const competencyScores = useMemo(() => {
    const scores = new Map<string, ScoreWithOutlier[]>();

    // First, filter requests by employee if needed
    const employeeFilteredRequests = filters?.employeeIds && filters.employeeIds.length > 0
      ? feedbackRequests.filter(request => filters?.employeeIds?.includes(request.employee_id) ?? false)
      : feedbackRequests;

    employeeFilteredRequests.forEach(request => {
      if (!request.analytics?.insights) return;

      request.analytics.insights.forEach(insight => {
        // Store all scores first, before filtering
        insight.competencies.forEach(comp => {
          if (!scores.has(comp.name)) {
            scores.set(comp.name, []);
          }
          
          const compScores = scores.get(comp.name)!;
          const score: ScoreWithOutlier = {
            name: comp.name,
            score: comp.score,
            confidence: comp.confidence,
            description: comp.description,
            evidenceCount: comp.evidenceCount,
            effectiveEvidenceCount: comp.evidenceCount,
            relationship: insight.relationship,
            evidenceQuotes: comp.evidenceQuotes ?? [],
            hasOutliers: false,
            adjustedWeight: RELATIONSHIP_WEIGHTS[insight.relationship as keyof typeof RELATIONSHIP_WEIGHTS]
          };
          compScores.push(score);
        });
      });
    });

    // Now apply filters and calculate scores
    const filteredScores = new Map<string, ScoreWithOutlier[]>();
    scores.forEach((compScores, compName) => {
      const filtered = compScores.filter(score => {
        // First filter by employee if needed
        if (filters?.employeeIds && filters.employeeIds.length > 0) {
          const employeeId = feedbackRequests.find(r => 
            r.analytics?.insights?.some(insight => 
              insight.competencies.some(comp => 
                comp.name === score.name && 
                comp.score === score.score && 
                insight.relationship === score.relationship
              )
            )
          )?.employee_id;
          
          if (!employeeId || !filters.employeeIds.includes(employeeId)) {
            return false;
          }
        }

        // Then filter by relationship if needed
        if (filters?.relationships && filters.relationships.length > 0) {
          // Normalize relationship type by removing _colleague and handling equal/peer
          const relationshipType = score.relationship.replace('_colleague', '');
          const normalizedType = relationshipType === 'equal' ? 'peer' : relationshipType;
          return filters.relationships.includes(normalizedType as 'senior' | 'peer' | 'junior');
        }
        return true;
      });
      
      if (filtered.length > 0) {
        filteredScores.set(compName, filtered);
      }
    });

    return {
      allScores: scores,
      filteredScores
    };
  }, [feedbackRequests, filters?.employeeIds, filters?.relationships]);

  // Memoize the processed data
  const {
    employeesWithAnalytics,
    totalEmployees,
    includedReviewCount,
    analyzedReviewCount,
    sortedScores,
    averageConfidence,
    evidenceCountByCompetency
  } = useMemo(() => {
    // First, filter requests by employee if needed
    const employeeFilteredRequests = filters?.employeeIds && filters.employeeIds.length > 0
      ? feedbackRequests.filter(request => filters?.employeeIds?.includes(request.employee_id) ?? false)
      : feedbackRequests;

    // Calculate total reviews for filtered employees
    const totalReviews = employeeFilteredRequests.reduce((sum, request) => 
      sum + (request.feedback_responses?.length || 0), 0);

    // Process feedback data with relationship filters
    const requestsToUse = employeeFilteredRequests
      .map(request => {
        // Filter responses based on relationship filter
        const filteredResponses = request.feedback_responses?.filter(response => {
          if (filters?.relationships && filters.relationships.length > 0) {
            // Normalize relationship type by removing _colleague and handling equal/peer
            const relationshipType = response.relationship.replace('_colleague', '');
            const normalizedType = relationshipType === 'equal' ? 'peer' : relationshipType;
            return filters.relationships.includes(normalizedType as 'senior' | 'peer' | 'junior');
          }
          return true;
        }) || [];

        // Filter insights based on relationship filter
        const filteredInsights = request.analytics?.insights?.filter(insight => {
          if (filters?.relationships && filters.relationships.length > 0) {
            // Normalize relationship type by removing _colleague and handling equal/peer
            const relationshipType = insight.relationship.replace('_colleague', '');
            const normalizedType = relationshipType === 'equal' ? 'peer' : relationshipType;
            return filters.relationships.includes(normalizedType as 'senior' | 'peer' | 'junior');
          }
          return true;
        }) || [];

        return {
          ...request,
          analytics: request.analytics ? {
            ...request.analytics,
            insights: filteredInsights
          } : undefined,
          feedback_responses: filteredResponses
        };
      });

    // Calculate coverage metrics using filtered data
    const employeesWithAnalytics = new Set(
      requestsToUse
        .filter(r => r.analytics?.insights && r.analytics.insights.length > 0 && r.feedback_responses && r.feedback_responses.length > 0)
        .map(r => r.employee_id)
    );

    // Calculate total employees who have any feedback of the selected types
    const employeesWithSelectedFeedback = new Set(
      requestsToUse
        .filter(r => r.feedback_responses && r.feedback_responses.length > 0)
        .map(r => r.employee_id)
    );

    // For team coverage:
    // - Numerator: number of employees with analyzed feedback of selected types
    // - Denominator: number of selected employees (if any), otherwise all employees with feedback
    const totalEmployees = filters?.employeeIds && filters.employeeIds.length > 0
      ? filters.employeeIds.length
      : employeesWithSelectedFeedback.size;

    // For review coverage:
    // - When no relationship filters or all selected: use total reviews from filtered employees
    // - When specific relationship filters: use filtered reviews
    const shouldUseTotal = !filters?.relationships || filters.relationships.length === 3;
    const reviewCount = shouldUseTotal 
      ? totalReviews 
      : requestsToUse.reduce((sum, r) => sum + (r.feedback_responses?.length || 0), 0);

    const includedReviewCount = reviewCount;
    const analyzedReviewCount = reviewCount;

    // Calculate aggregate scores with outlier detection
    const sortedScores: ScoreWithOutlier[] = COMPETENCY_ORDER.map(competencyName => {
      const allCompScores = competencyScores.allScores.get(competencyName) || [];
      const filteredCompScores = competencyScores.filteredScores.get(competencyName) || [];
      
      // Use all scores when no filters or all filters are selected
      const scoresToUse = (!filters?.relationships || filters.relationships.length === 3)
        ? allCompScores
        : filteredCompScores;

      if (scoresToUse.length === 0) {
        return null;
      }

      // Detect and adjust outliers using appropriate scores
      const adjustedScores = detectOutliers(scoresToUse);
      const hasOutliers = adjustedScores.some(s => s.adjustedWeight !== RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]);
      const adjustmentDetails = adjustedScores
        .filter(s => s.adjustmentDetails)
        .flatMap(s => s.adjustmentDetails || []);
      
      // Calculate weighted average score using appropriate scores
      const totalWeight = adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
        sum + (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]), 0);
      
      const weightedScore = Number((adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
        sum + (s.score * (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS])), 0) / totalWeight).toFixed(3));

      // Calculate confidence using the same scores as the weighted average
      const confidenceResult = calculateConfidence(scoresToUse);

      // Calculate relationship breakdown using appropriate scores
      const relationshipBreakdown = {
        senior: scoresToUse.reduce((sum, s) => sum + (s.relationship === 'senior' ? s.evidenceCount : 0), 0),
        peer: scoresToUse.reduce((sum, s) => sum + (s.relationship === 'peer' ? s.evidenceCount : 0), 0),
        junior: scoresToUse.reduce((sum, s) => sum + (s.relationship === 'junior' ? s.evidenceCount : 0), 0)
      };

      // Calculate score distribution using appropriate scores
      const scoreDistribution = scoresToUse.reduce((dist, s) => {
        const roundedScore = Math.round(s.score);
        dist[roundedScore] = (dist[roundedScore] || 0) + 1;
        return dist;
      }, {} as Record<number, number>);

      // Calculate average score and standard deviation using appropriate scores
      const allScores = scoresToUse.map(s => s.score);
      const averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
      const variance = allScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / allScores.length;
      const standardDeviation = Math.sqrt(variance);

      // Combine evidence quotes from appropriate scores
      const evidenceQuotes = Array.from(new Set(scoresToUse.flatMap(s => s.evidenceQuotes ?? [])));

      return {
        name: competencyName,
        score: weightedScore,
        confidence: confidenceResult.level,
        evidenceCount: scoresToUse.reduce((sum, s) => sum + s.evidenceCount, 0),
        effectiveEvidenceCount: confidenceResult.metrics.factors.evidenceCount,
        relationship: 'aggregate',
        hasOutliers,
        adjustmentDetails: adjustmentDetails.length > 0 ? adjustmentDetails : undefined,
        description: CORE_COMPETENCIES[COMPETENCY_NAME_TO_KEY[competencyName]]?.aspects?.join(' • ') || '',
        confidenceMetrics: confidenceResult.metrics,
        relationshipBreakdown,
        scoreDistribution,
        averageScore,
        scoreSpread: standardDeviation,
        evidenceQuotes
      } as ScoreWithOutlier;
    }).filter((score): score is ScoreWithOutlier => score !== null);

    // Calculate confidence metrics using all scores
    const averageConfidence = sortedScores.reduce((sum, s) => {
      const weight = CONFIDENCE_WEIGHTS[s.confidence];
      return sum + weight;
    }, 0) / sortedScores.length;

    // Calculate evidence counts per competency
    const evidenceCountByCompetency = sortedScores.reduce((acc, score) => {
      acc[score.name] = score.evidenceCount;
      return acc;
    }, {} as Record<string, number>);

    return {
      employeesWithAnalytics: employeesWithAnalytics.size,
      totalEmployees,
      includedReviewCount,
      analyzedReviewCount,
      sortedScores,
      averageConfidence,
      evidenceCountByCompetency
    };
  }, [competencyScores]);

  if (sortedScores.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="text-xs font-normal bg-black text-white hover:bg-black">
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-sm">
                    AI-powered analysis of competencies based on feedback responses. This feature is in beta as we continue to refine our analysis methods.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Based on {analyzedReviewCount} of {includedReviewCount} completed reviews
              </p>
            </div>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[400px] p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Competency Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    A comprehensive view of competencies, based on AI-analyzed feedback from peers, managers, and direct reports.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Methodology:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                    <li>Scores weighted by relationship (senior 40%, peer 35%, junior 25%)</li>
                    <li>Statistical outliers adjusted to maintain balance</li>
                    <li>Minimum {MIN_REVIEWS_REQUIRED} reviews per employee for inclusion</li>
                    <li>Confidence based on evidence count, score consistency, and feedback diversity</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Color Scheme:</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      Green (≥4.0): Significantly exceeding expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      Blue (≥3.5): Exceeding expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      Yellow (≥3.0): Meeting expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                      Orange (≥2.5): Approaching expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      Red (&lt;2.5): Needs improvement
                    </li>
                  </ul>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
                      100% opacity: High
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500 opacity-70"></div>
                      70%: Medium
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500 opacity-40"></div>
                      40%: Low
                    </div>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          {showTeamStats && (
            <TeamSummaryStats
              employeesWithAnalytics={employeesWithAnalytics}
              totalEmployees={totalEmployees}
              includedReviewCount={analyzedReviewCount}
              totalReviewCount={includedReviewCount}
              averageEvidenceCount={sortedScores.reduce((sum, s) => sum + s.evidenceCount, 0) / sortedScores.length}
              evidenceCountByCompetency={evidenceCountByCompetency}
              averageConfidence={averageConfidence}
              sortedScores={sortedScores}
            />
          )}

          {/* Detailed Scores */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Competency Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click on any competency to see detailed analysis
                  </p>
                </div>
                {COMPETENCY_ORDER.length > sortedScores.length && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <InfoIcon className="h-4 w-4 shrink-0" />
                          <span className="whitespace-nowrap">Filtered view active</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <div className="flex items-start gap-2 p-1">
                          <InfoIcon className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                          <p className="text-sm leading-snug">
                            Some competencies are hidden due to insufficient feedback data for the current filters
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div className="divide-y relative">
              {COMPETENCY_ORDER.map((name) => {
                const score = sortedScores.find(s => s.name === name);
                if (!score) return null;
                const isExpanded = expandedCompetency === name;
                
                return (
                  <div 
                    key={name} 
                    ref={el => competencyRefs.current[name] = el}
                    className={cn(
                      "transition-colors duration-200 scroll-mt-16",
                      isExpanded && "bg-slate-50"
                    )}
                  >
                    {/* Header Section */}
                    <div className={cn(
                      "transition-colors duration-200",
                      isExpanded && "sticky top-0 z-10"
                    )}>
                      {/* Header Background - separate layer for visual effects */}
                      <div className={cn(
                        "absolute inset-x-0 top-0 h-full bg-slate-50 shadow-sm",
                        isExpanded ? "border-b" : "hidden"
                      )} />
                      
                      {/* Header Content */}
                      <div className="relative p-4">
                        <CompetencySummaryCard
                          score={score}
                          isExpanded={isExpanded}
                          onToggle={() => handleCompetencyToggle(name, isExpanded)}
                        />
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-4">
                        <CompetencyDetails 
                          score={{
                            ...score,
                            teamScores: competencyScores.allScores.get(score.name) || []
                          }} 
                          feedbackRequests={feedbackRequests}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 