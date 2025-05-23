import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecentReviews } from '../RecentReviews';
import { DashboardFeedbackRequest, DashboardFeedbackResponse } from '@/types/feedback/dashboard';

// Create a function reference for assertions
const mockManagerSurveyReviewCard = vi.fn();

// Setup mock properly
vi.mock('../ManagerSurveyReviewCard', () => ({
  ManagerSurveyReviewCard: (props: any) => {
    mockManagerSurveyReviewCard(props);
    return (
      <div data-testid={`review-card-${props.review.id}`} data-cycle={props.reviewCycleId}>
        Mock Card
      </div>
    );
  }
}));

describe.skip('RecentReviews Component', () => {
  const questionMap = { q1: 'Question 1' };

  const createResponse = (id: string): any => ({
    id,
    feedback_request_id: 'req1',
    relationship: 'equal_colleague',
    strengths: '',
    areas_for_improvement: '',
    submitted_at: '2023-01-01T00:00:00Z',
    status: 'submitted',
    session_id: id,
    created_at: '2023-01-01T00:00:00Z',
    employee: { id: 'emp1', name: 'Alice', role: 'Developer' },
    responses: { q1: 5 }
  });

  const feedbackRequests: DashboardFeedbackRequest[] = [
    {
      id: 'req1',
      employee_id: 'emp1',
      review_cycle_id: 'cycle1',
      status: 'completed',
      target_responses: 8,
      unique_link: 'link',
      employee: { id: 'emp1', name: 'Alice', role: 'Developer' },
      feedback_responses: Array.from({ length: 8 }, (_, i) => createResponse(`r${i + 1}`))
    }
  ];

  beforeEach(() => {
    mockManagerSurveyReviewCard.mockClear();
  });

  it('renders review cards and loads more when button is clicked', () => {
    render(
      <RecentReviews
        feedbackRequests={feedbackRequests}
        questionIdToTextMap={questionMap}
        reviewCycleId="cycle1"
      />
    );

    // Initially only 6 cards should be visible
    expect(screen.getAllByTestId(/review-card-/)).toHaveLength(6);

    const loadMore = screen.getByRole('button', { name: /Load More Reviews/i });
    fireEvent.click(loadMore);

    // After clicking, all 8 cards should be visible
    expect(screen.getAllByTestId(/review-card-/)).toHaveLength(8);
  });

  it('passes reviewCycleId to ManagerSurveyReviewCard', () => {
    render(
      <RecentReviews
        feedbackRequests={feedbackRequests}
        questionIdToTextMap={questionMap}
        reviewCycleId="cycle1"
      />
    );

    expect(mockManagerSurveyReviewCard).toHaveBeenCalled();
    mockManagerSurveyReviewCard.mock.calls.forEach((args) => {
      expect(args[0].reviewCycleId).toBe('cycle1');
    });
  });
});
