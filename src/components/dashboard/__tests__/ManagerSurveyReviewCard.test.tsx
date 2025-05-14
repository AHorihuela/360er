import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManagerSurveyReviewCard } from '../ManagerSurveyReviewCard';
import { DashboardFeedbackResponse } from '@/types/feedback/dashboard';
import { FeedbackStatus, RelationshipType } from '@/types/feedback/base';

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock navigation function
const mockNavigate = vi.fn();

describe('ManagerSurveyReviewCard', () => {
  // Mock data for tests
  const mockReview: DashboardFeedbackResponse = {
    id: 'test-review-id',
    status: 'completed' as FeedbackStatus,
    submitted_at: '2023-05-08T10:00:00Z',
    relationship: 'equal_colleague' as RelationshipType,
    strengths: 'Good communication',
    areas_for_improvement: 'Could improve delegation',
    feedback_request_id: 'test-request-id',
    employee: {
      id: 'test-employee-id',
      name: 'Test Employee',
      role: 'Developer'
    },
    responses: {
      'q1': 4,
      'q2': 3,
      'q3': 5,
      'q4': 'Some text feedback'
    }
  };

  const mockQuestionMap: Record<string, string> = {
    'q1': 'Question 1',
    'q2': 'Question 2', 
    'q3': 'Question 3',
    'q4': 'Open ended question'
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders employee information correctly', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
      />
    );

    expect(screen.getByText('Test Employee')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('5/8/2023')).toBeInTheDocument();
  });

  it('calculates and displays average score correctly', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
      />
    );
    
    // Average of 4, 3, and 5 is 4.0
    expect(screen.getByText('4.0')).toBeInTheDocument();
  });

  it('allows expanding and collapsing details', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
      />
    );
    
    // Initially details shouldn't be visible
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('Show all responses'));
    
    // Now details should be visible
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText('Question 3')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('Hide details'));
    
    // Details should be hidden again
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
  });

  it('navigates to the employee review page when clicked with reviewCycleId', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
        reviewCycleId="test-cycle-id"
      />
    );
    
    // Click the card (not the details button)
    const card = screen.getByText('Test Employee').closest('.overflow-hidden');
    fireEvent.click(card!);
    
    // Should navigate to the correct URL
    expect(mockNavigate).toHaveBeenCalledWith('/reviews/test-cycle-id/employee/test-employee-id');
  });

  it('does not navigate when reviewCycleId is not provided', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
      />
    );
    
    // Click the card (not the details button)
    const card = screen.getByText('Test Employee').closest('.overflow-hidden');
    fireEvent.click(card!);
    
    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when clicking the details button', () => {
    render(
      <ManagerSurveyReviewCard
        review={mockReview}
        questionIdToTextMap={mockQuestionMap}
        reviewCycleId="test-cycle-id"
      />
    );
    
    // Click the details button
    fireEvent.click(screen.getByText('Show all responses'));
    
    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
}); 