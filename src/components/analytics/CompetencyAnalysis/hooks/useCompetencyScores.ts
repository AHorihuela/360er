import { useMemo } from 'react';
import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { RELATIONSHIP_WEIGHTS, CONFIDENCE_WEIGHTS, COMPETENCY_ORDER } from '@/components/dashboard/constants';
import { detectOutliers, calculateConfidence } from '@/components/dashboard/utils';
import { type ScoreWithOutlier } from '@/components/dashboard/types';
import { type CompetencyFilters } from '@/types/analytics';
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';

interface UseCompetencyScoresResult {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  analyzedReviewCount: number;
  sortedScores: ScoreWithOutlier[];
  averageConfidence: number;
  evidenceCountByCompetency: Record<string, number>;
}

export function useCompetencyScores(
  feedbackRequests: DashboardFeedbackRequest[],
  filters?: CompetencyFilters
): UseCompetencyScoresResult {
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
  return useMemo(() => {
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

      // Filter out scores with no evidence before aggregation
      const validScores = scoresToUse.filter(s => s.evidenceCount > 0);

      if (validScores.length === 0) {
        return null;
      }

      // Detect and adjust outliers using appropriate scores
      const adjustedScores = detectOutliers(validScores);
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
  }, [competencyScores, feedbackRequests, filters]);
} 