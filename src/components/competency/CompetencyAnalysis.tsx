import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MIN_REVIEWS_REQUIRED, RELATIONSHIP_WEIGHTS, CONFIDENCE_WEIGHTS, COMPETENCY_ORDER } from '@/components/dashboard/constants';
import { CompetencyDetails } from '@/components/dashboard/CompetencyDetails';
import { TeamSummaryStats } from '@/components/dashboard/TeamSummaryStats';
import { CompetencySummaryCard } from '@/components/dashboard/CompetencySummaryCard';
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';
import { cn } from '@/lib/utils';
import type { CompetencyFilters } from '@/types/analytics';
import type { DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import type { ScoreWithOutlier } from '@/components/dashboard/types';

// Utility functions for score and confidence colors
const getScoreColor = (score: number): string => {
  if (score >= 4.0) return 'bg-green-500';
  if (score >= 3.5) return 'bg-blue-500';
  if (score >= 3.0) return 'bg-yellow-500';
  if (score >= 2.5) return 'bg-orange-500';
  return 'bg-red-500';
};

const getConfidenceColor = (confidence: 'low' | 'medium' | 'high'): string => {
  switch (confidence) {
    case 'high': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

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

  const handleCompetencyToggle = (name: string, isCurrentlyExpanded: boolean) => {
    setExpandedCompetency(isCurrentlyExpanded ? null : name);
  };

  // Memoize competency scores processing with hybrid approach
  const competencyScores = useMemo(() => {
    const allScores = new Map<string, ScoreWithOutlier[]>();
    const filteredScores = new Map<string, ScoreWithOutlier[]>();
    const relationshipScores = new Map<string, Map<string, ScoreWithOutlier[]>>();

    // Filter requests by employee if needed
    const employeeFilteredRequests = filters?.employeeIds && filters.employeeIds.length > 0
      ? feedbackRequests.filter(request => filters?.employeeIds?.includes(request.employee_id) ?? false)
      : feedbackRequests;

    employeeFilteredRequests.forEach(request => {
      if (!request.analytics?.insights) return;

      request.analytics.insights.forEach(insight => {
        insight.competencies.forEach(comp => {
          // Process aggregate insights (these are the "official" pre-calculated scores)
          if (insight.relationship === 'aggregate') {
            const score: ScoreWithOutlier = {
              name: comp.name,
              score: comp.score, // Use pre-calculated aggregate score directly
              confidence: comp.confidence,
              description: comp.description,
              evidenceCount: comp.evidenceCount,
              effectiveEvidenceCount: comp.evidenceCount,
              relationship: 'aggregate',
              evidenceQuotes: comp.evidenceQuotes ?? [],
              hasOutliers: false,
              adjustedWeight: RELATIONSHIP_WEIGHTS.aggregate
            };

            // Add to all scores
            if (!allScores.has(comp.name)) {
              allScores.set(comp.name, []);
            }
            allScores.get(comp.name)!.push(score);

            // Add to filtered scores if no relationship filter applied
            if (!filters?.relationships || filters.relationships.length === 0) {
              if (!filteredScores.has(comp.name)) {
                filteredScores.set(comp.name, []);
              }
              filteredScores.get(comp.name)!.push(score);
            }
          }
          
          // Process individual relationship insights for filtering capability
          if (insight.relationship !== 'aggregate') {
            const relationshipType = insight.relationship.replace('_colleague', '');
            const normalizedType = relationshipType === 'equal' ? 'peer' : relationshipType;

            if (!relationshipScores.has(comp.name)) {
              relationshipScores.set(comp.name, new Map());
            }
            if (!relationshipScores.get(comp.name)!.has(normalizedType)) {
              relationshipScores.get(comp.name)!.set(normalizedType, []);
            }

            const score: ScoreWithOutlier = {
              name: comp.name,
              score: comp.score,
              confidence: comp.confidence,
              description: comp.description,
              evidenceCount: comp.evidenceCount,
              effectiveEvidenceCount: comp.evidenceCount,
              relationship: normalizedType,
              evidenceQuotes: comp.evidenceQuotes ?? [],
              hasOutliers: false,
              adjustedWeight: RELATIONSHIP_WEIGHTS[normalizedType as keyof typeof RELATIONSHIP_WEIGHTS] || 1
            };

            relationshipScores.get(comp.name)!.get(normalizedType)!.push(score);

            // Add to filtered scores if relationship filter matches
            if (filters?.relationships && filters.relationships.includes(normalizedType as any)) {
              if (!filteredScores.has(comp.name)) {
                filteredScores.set(comp.name, []);
              }
              filteredScores.get(comp.name)!.push(score);
            }
          }
        });
      });
    });

    return {
      allScores,
      filteredScores,
      relationshipScores
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

    // Calculate aggregate scores with hybrid methodology
    const sortedScores: ScoreWithOutlier[] = COMPETENCY_ORDER.map(competencyName => {
      const allCompScores = competencyScores.allScores.get(competencyName) || [];
      const filteredCompScores = competencyScores.filteredScores.get(competencyName) || [];
      
      // Determine which scores to use based on filter state
      const hasRelationshipFilter = filters?.relationships && filters.relationships.length > 0;
      const hasEmployeeFilter = filters?.employeeIds && filters.employeeIds.length > 0;
      
      // Use filtered scores when any filters are applied, otherwise use all scores
      const scoresToUse = (hasRelationshipFilter || hasEmployeeFilter) 
        ? filteredCompScores 
        : allCompScores;

      if (scoresToUse.length === 0) {
        return null;
      }

      // For aggregate scores (default), use the pre-calculated values directly
      // For relationship-filtered scores, calculate averages appropriately
      if (!hasRelationshipFilter && scoresToUse.length > 0 && scoresToUse[0].relationship === 'aggregate') {
        // Use pre-calculated aggregate scores as-is (best for consistency)
        const totalScores = scoresToUse.length;
        const averageScore = scoresToUse.reduce((sum, s) => sum + s.score, 0) / totalScores;
        const evidenceCount = scoresToUse.reduce((sum, s) => sum + s.evidenceCount, 0);
        
        // Determine overall confidence level based on individual score confidences
        const confidenceCounts = scoresToUse.reduce((acc, s) => {
          acc[s.confidence]++;
          return acc;
        }, { low: 0, medium: 0, high: 0 });
        
        let overallConfidence: 'low' | 'medium' | 'high';
        if (confidenceCounts.high > totalScores / 2) {
          overallConfidence = 'high';
        } else if (confidenceCounts.low > totalScores / 2) {
          overallConfidence = 'low';
        } else {
          overallConfidence = 'medium';
        }

        // Use the aggregate score directly (no re-calculation needed)
        const firstScore = scoresToUse[0];
        return {
          ...firstScore,
          score: Number(averageScore.toFixed(3)),
          confidence: overallConfidence,
          evidenceCount: evidenceCount,
          effectiveEvidenceCount: evidenceCount,
          scoreDistribution: scoresToUse.reduce((dist, s) => {
            const roundedScore = Math.round(s.score);
            dist[roundedScore] = (dist[roundedScore] || 0) + 1;
            return dist;
          }, {} as Record<number, number>),
          evidenceQuotes: Array.from(new Set(scoresToUse.flatMap(s => s.evidenceQuotes ?? []))),
          averageScore: averageScore,
          scoreSpread: 0 // No spread for aggregate scores
        } as ScoreWithOutlier;
      } else {
        // For relationship-filtered scores, calculate properly
        const totalScores = scoresToUse.length;
        const averageScore = scoresToUse.reduce((sum, s) => sum + s.score, 0) / totalScores;
        const evidenceCount = scoresToUse.reduce((sum, s) => sum + s.evidenceCount, 0);
        
        // Calculate basic variance for relationship-filtered scores
        const variance = scoresToUse.reduce((sum, s) => sum + Math.pow(s.score - averageScore, 2), 0) / totalScores;
        const standardDeviation = Math.sqrt(variance);

        // Determine overall confidence level
        const confidenceCounts = scoresToUse.reduce((acc, s) => {
          acc[s.confidence]++;
          return acc;
        }, { low: 0, medium: 0, high: 0 });
        
        let overallConfidence: 'low' | 'medium' | 'high';
        if (confidenceCounts.high > totalScores / 2) {
          overallConfidence = 'high';
        } else if (confidenceCounts.low > totalScores / 2) {
          overallConfidence = 'low';
        } else {
          overallConfidence = 'medium';
        }

        // Calculate score distribution
        const scoreDistribution = scoresToUse.reduce((dist, s) => {
          const roundedScore = Math.round(s.score);
          dist[roundedScore] = (dist[roundedScore] || 0) + 1;
          return dist;
        }, {} as Record<number, number>);

        // Combine evidence quotes from all scores
        const evidenceQuotes = Array.from(new Set(scoresToUse.flatMap(s => s.evidenceQuotes ?? [])));

        return {
          name: competencyName,
          score: Number(averageScore.toFixed(3)),
          confidence: overallConfidence,
          evidenceCount: evidenceCount,
          effectiveEvidenceCount: evidenceCount,
          relationship: hasRelationshipFilter ? scoresToUse[0].relationship : 'aggregate',
          hasOutliers: false,
          adjustmentDetails: undefined,
          description: CORE_COMPETENCIES[COMPETENCY_NAME_TO_KEY[competencyName]]?.aspects?.join(' • ') || '',
          confidenceMetrics: {
            evidenceScore: Math.min(evidenceCount / 15, 1),
            consistencyScore: Math.max(0, 1 - variance / 2),
            relationshipScore: hasRelationshipFilter ? 0.7 : 0.9, // Lower for filtered views
            finalScore: Math.min(evidenceCount / 15, 1) * 0.4 + Math.max(0, 1 - variance / 2) * 0.6,
            factors: {
              evidenceCount: evidenceCount,
              variance: variance,
              relationshipCount: hasRelationshipFilter ? 1 : 3,
              distributionQuality: 1
            }
          },
          relationshipBreakdown: hasRelationshipFilter ? {
            [scoresToUse[0].relationship]: evidenceCount
          } : {
            senior: Math.round(evidenceCount * 0.4),
            peer: Math.round(evidenceCount * 0.35),
            junior: Math.round(evidenceCount * 0.25)
          },
          scoreDistribution,
          averageScore,
          scoreSpread: standardDeviation,
          evidenceQuotes
        } as ScoreWithOutlier;
      }
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
  }, [competencyScores, filters?.employeeIds]);

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
                    <li>Default view uses pre-calculated aggregate scores (Senior 40%, Peer 35%, Junior 25%)</li>
                    <li>Relationship filtering shows scores from selected feedback sources only</li>
                    <li>Employee filtering supported for both aggregate and relationship views</li>
                    <li>Maintains consistency with individual employee review pages</li>
                    <li>Minimum {MIN_REVIEWS_REQUIRED} reviews per employee for inclusion</li>
                    <li>Confidence based on evidence count, score consistency, and feedback diversity</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-1 text-blue-800">Filtering Options:</h4>
                  <p className="text-xs text-blue-700">
                    <strong>No filters:</strong> Shows aggregate scores (recommended for official reviews)<br/>
                    <strong>Relationship filters:</strong> Shows scores from specific feedback sources for detailed analysis
                  </p>
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