import { type DashboardEmployee, type DashboardFeedbackRequest, type DashboardFeedbackResponse, type ReviewCycleInput, type MapFeedbackResult, type DashboardCompetency } from '@/types/feedback/dashboard';
import { type FeedbackRequest, type FeedbackResponse } from '@/types/review';
import { type FeedbackStatus, type RelationshipType } from '@/types/feedback/base';

/**
 * Maps feedback requests from a review cycle to dashboard format
 * @param reviewCycle - The review cycle data to process
 * @param employeesData - Employee data to merge with feedback requests
 * @returns Mapped feedback data with statistics
 */
export function mapFeedbackRequestsToDashboard(
  reviewCycle: ReviewCycleInput,
  employeesData: DashboardEmployee[] | null
): MapFeedbackResult {
  if (!reviewCycle.feedback_requests) {
    return {
      mappedRequests: [],
      totalRequests: 0,
      completedRequests: 0,
      employeesWithStatus: employeesData?.map(employee => ({
        ...employee,
        completed_reviews: 0,
        total_reviews: 0
      }))
    };
  }

  const totalRequests = reviewCycle.feedback_requests.reduce(
    (acc: number, fr: FeedbackRequest) => acc + fr.target_responses, 
    0
  );
  
  const completedRequests = reviewCycle.feedback_requests.reduce(
    (acc: number, fr: FeedbackRequest) => acc + (fr.feedback_responses?.length ?? 0), 
    0
  );

  const mappedRequests = reviewCycle.feedback_requests.map((fr: FeedbackRequest): DashboardFeedbackRequest => ({
    ...fr,
    employee: Array.isArray(fr.employee) ? fr.employee[0] : fr.employee,
    feedback_responses: fr.feedback_responses?.map((response: FeedbackResponse): DashboardFeedbackResponse => ({
      ...response,
      feedback_request_id: fr.id,
      status: response.status as FeedbackStatus,
      relationship: response.relationship as RelationshipType
    })),
    analytics: fr.analytics ? {
      id: fr.analytics.id,
      insights: fr.analytics.insights.map(insight => ({
        ...insight,
        competencies: insight.competencies.map((comp: DashboardCompetency) => ({
          ...comp,
          evidenceQuotes: comp.evidenceQuotes ?? []
        }))
      }))
    } : undefined
  }));

  const employeesWithStatus = employeesData?.map((employee: DashboardEmployee) => {
    const employeeRequest = reviewCycle.feedback_requests?.find(
      (fr: FeedbackRequest) => fr.employee_id === employee.id
    );
    return {
      ...employee,
      completed_reviews: employeeRequest?.feedback_responses?.length ?? 0,
      total_reviews: employeeRequest?.target_responses ?? 0
    };
  });

  return {
    mappedRequests,
    totalRequests,
    completedRequests,
    employeesWithStatus
  };
} 