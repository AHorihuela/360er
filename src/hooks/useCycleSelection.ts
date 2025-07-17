import { useState, useEffect } from 'react';
import { type ReviewCycleWithUser } from '@/types/review';
import { type DashboardEmployee, type ReviewCycleWithFeedback } from '@/types/feedback/dashboard';
import { type ReviewCycleType } from '@/types/survey';
import { mapFeedbackRequestsToDashboard } from '@/utils/dashboardUtils';

/**
 * Custom hook for managing cycle selection and active cycle state
 */
export function useCycleSelection() {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => {
    return localStorage.getItem('selectedCycleId');
  });
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycleWithFeedback | null>(null);

  const handleCycleChange = (
    cycleId: string,
    allReviewCycles: ReviewCycleWithUser[],
    employeesData: DashboardEmployee[],
    onSurveyQuestionsFetch?: (cycleType: ReviewCycleType) => void
  ) => {
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
    const selectedCycle = allReviewCycles.find(c => c.id === cycleId);
    
    if (selectedCycle && selectedCycle.feedback_requests) {
      const {
        mappedRequests,
        totalRequests,
        completedRequests
      } = mapFeedbackRequestsToDashboard({
        id: selectedCycle.id,
        title: selectedCycle.title,
        review_by_date: selectedCycle.review_by_date,
        feedback_requests: selectedCycle.feedback_requests
      }, employeesData);

      setActiveReviewCycle({
        id: selectedCycle.id,
        title: selectedCycle.title,
        review_by_date: selectedCycle.review_by_date,
        type: selectedCycle.type,
        feedback_requests: mappedRequests,
        total_requests: totalRequests,
        completed_requests: completedRequests
      });

      // Fetch survey questions if cycle has a type
      if (selectedCycle.type && onSurveyQuestionsFetch) {
        onSurveyQuestionsFetch(selectedCycle.type);
      }
    } else {
      setActiveReviewCycle(null);
    }

    return selectedCycle;
  };

  const selectMostRecentCycle = (
    allReviewCycles: ReviewCycleWithUser[],
    employeesData: DashboardEmployee[],
    onSurveyQuestionsFetch?: (cycleType: ReviewCycleType) => void
  ) => {
    if (allReviewCycles.length === 0) {
      setActiveReviewCycle(null);
      return null;
    }

    const mostRecentCycle = allReviewCycles[0];
    return handleCycleChange(mostRecentCycle.id, allReviewCycles, employeesData, onSurveyQuestionsFetch);
  };

  const processSelectedCycle = (
    cycleToSelect: ReviewCycleWithUser,
    employeesData: DashboardEmployee[],
    onSurveyQuestionsFetch?: (cycleType: ReviewCycleType) => void
  ) => {
    if (cycleToSelect && cycleToSelect.feedback_requests) {
      const {
        mappedRequests,
        totalRequests,
        completedRequests
      } = mapFeedbackRequestsToDashboard({
        id: cycleToSelect.id,
        title: cycleToSelect.title,
        review_by_date: cycleToSelect.review_by_date,
        feedback_requests: cycleToSelect.feedback_requests
      }, employeesData);

      setActiveReviewCycle({
        id: cycleToSelect.id,
        title: cycleToSelect.title,
        review_by_date: cycleToSelect.review_by_date,
        type: cycleToSelect.type,
        feedback_requests: mappedRequests,
        total_requests: totalRequests,
        completed_requests: completedRequests
      });

      // Fetch survey questions if cycle has a type
      if (cycleToSelect.type && onSurveyQuestionsFetch) {
        onSurveyQuestionsFetch(cycleToSelect.type);
      }
    } else {
      setActiveReviewCycle(null);
    }
  };

  const clearSelectedCycle = () => {
    localStorage.removeItem('selectedCycleId');
    setSelectedCycleId(null);
    setActiveReviewCycle(null);
  };

  return {
    selectedCycleId,
    activeReviewCycle,
    setSelectedCycleId,
    setActiveReviewCycle,
    handleCycleChange,
    selectMostRecentCycle,
    processSelectedCycle,
    clearSelectedCycle
  };
} 