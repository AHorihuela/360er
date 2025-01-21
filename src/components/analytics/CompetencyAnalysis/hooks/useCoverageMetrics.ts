import { useMemo } from 'react';
import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters, type RelationshipType } from '../types';

interface CoverageMetrics {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  analyzedReviewCount: number;
}

export function useCoverageMetrics(
  feedbackRequests: DashboardFeedbackRequest[],
  filters?: CompetencyFilters
): CoverageMetrics {
  return useMemo(() => {
    // First, calculate total reviews regardless of filters
    const totalReviews = feedbackRequests.reduce((sum, request) => 
      sum + (request.feedback_responses?.length || 0), 0);

    // Process feedback data with filters
    const requestsToUse = feedbackRequests.map(request => {
      // Filter responses based on relationship filter
      const filteredResponses = request.feedback_responses?.filter(response => {
        if (filters?.relationships && filters.relationships.length > 0) {
          // Normalize relationship type by removing _colleague and handling equal/peer
          const baseType = response.relationship.replace('_colleague', '');
          const normalizedType = baseType === 'equal' ? 'peer' : baseType;
          return filters.relationships.includes(normalizedType as RelationshipType);
        }
        return true;
      }) || [];

      // Filter insights based on relationship filter
      const filteredInsights = request.analytics?.insights?.filter(insight => {
        if (filters?.relationships && filters.relationships.length > 0) {
          // Normalize relationship type by removing _colleague and handling equal/peer
          const baseType = insight.relationship.replace('_colleague', '');
          const normalizedType = baseType === 'equal' ? 'peer' : baseType;
          return filters.relationships.includes(normalizedType as RelationshipType);
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
    // - Numerator: number of employees with analyzed feedback of selected types (must be subset of denominator)
    // - Denominator: number of employees with any feedback of selected types
    const totalEmployees = employeesWithSelectedFeedback.size;
    const analyzedEmployees = new Set(
      Array.from(employeesWithAnalytics).filter(id => employeesWithSelectedFeedback.has(id))
    ).size;

    // For review coverage:
    // - When no filters or all filters selected: use total reviews
    // - When specific filters selected: use filtered reviews
    const shouldUseTotal = !filters?.relationships || filters.relationships.length === 3;
    const reviewCount = shouldUseTotal 
      ? totalReviews 
      : requestsToUse.reduce((sum, r) => sum + (r.feedback_responses?.length || 0), 0);

    return {
      employeesWithAnalytics: analyzedEmployees,
      totalEmployees,
      includedReviewCount: reviewCount,
      analyzedReviewCount: reviewCount
    };
  }, [feedbackRequests, filters?.relationships]);
} 