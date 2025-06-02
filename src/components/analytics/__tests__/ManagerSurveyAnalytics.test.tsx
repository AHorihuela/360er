import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManagerSurveyAnalytics } from '../ManagerSurveyAnalytics';
import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { FeedbackResponse } from '@/types/feedback';

// Mock the ManagerComparisonChart component since it's not the focus of these tests
vi.mock('../ManagerComparisonChart', () => ({
  ManagerComparisonChart: ({ managerScores }: { managerScores: any[] }) => (
    <div data-testid="manager-comparison-chart">
      Manager Comparison Chart with {managerScores.length} managers
    </div>
  )
}));

// Mock data for testing
const mockQuestionIdToTextMap: Record<string, string> = {
  'q1': 'How effectively does this manager communicate with the team?',
  'q2': 'How well does this manager provide feedback and guidance?',
  'q3': 'How effectively does this manager support your professional development?',
};

const createMockFeedbackRequest = (
  managerId: string,
  managerName: string,
  responses: FeedbackResponse[]
): DashboardFeedbackRequest => ({
  id: `request-${managerId}`,
  employee_id: managerId,
  review_cycle_id: 'cycle-1',
  status: 'active',
  target_responses: 5,
  unique_link: `link-${managerId}`,
  created_at: '2023-07-01T00:00:00Z',
  employee: {
    id: managerId,
    name: managerName,
    role: 'Manager'
  },
  feedback_responses: responses,
  analytics: undefined
});

const createMockResponse = (
  id: string,
  scores: Record<string, number>
): FeedbackResponse => ({
  id,
  feedback_request_id: 'request-1',
  session_id: `session-${id}`,
  submitted_at: '2023-07-01T00:00:00Z',
  status: 'submitted',
  relationship: 'equal_colleague',
  strengths: 'Great communication',
  areas_for_improvement: 'Could delegate more',
  created_at: '2023-07-01T00:00:00Z',
  responses: scores
}) as FeedbackResponse;

describe('ManagerSurveyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('renders with correct title and description', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      expect(screen.getByText('Manager Effectiveness Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Summary of manager effectiveness based on/)).toBeInTheDocument();
    });

    it('shows no data message when no feedback responses exist', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      expect(screen.getByText('No feedback data available for analysis. Please collect some feedback to see manager analytics.')).toBeInTheDocument();
    });

    it('calculates correct overall average', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 }), // avg: 4.0
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })  // avg: 3.0
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      // Overall average should be (4+5+3+3+4+2)/6 = 3.5
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });
  });

  describe('Review count filtering', () => {
    it('applies default minReviewCount of 1', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ]),
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      // Should show both managers (both have >= 1 review)
      expect(screen.getByText(/Summary of manager effectiveness based on 2 responses across 2 manager/)).toBeInTheDocument();
    });

    it('filters out managers with insufficient reviews when minReviewCount > 1', () => {
      const mockRequests = [
        // Manager 1: 3 responses (should be included with minReviewCount=3)
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 }),
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 }),
          createMockResponse('response3', { q1: 5, q2: 3, q3: 4 })
        ]),
        // Manager 2: 2 responses (should be excluded with minReviewCount=3)
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response4', { q1: 3, q2: 4, q3: 2 }),
          createMockResponse('response5', { q1: 4, q2: 3, q3: 5 })
        ]),
        // Manager 3: 1 response (should be excluded with minReviewCount=3)
        createMockFeedbackRequest('manager3', 'Bob Johnson', [
          createMockResponse('response6', { q1: 2, q2: 3, q3: 1 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={3}
        />
      );

      // Should only show 1 manager (only John Doe has >= 3 reviews)
      expect(screen.getByText(/1 manager/)).toBeInTheDocument();
      // Should show 3 responses total (only from John Doe)
      expect(screen.getByText(/3 responses/)).toBeInTheDocument();
    });

    it('recalculates averages correctly when filtering by review count', () => {
      const mockRequests = [
        // Manager 1: 2 responses, scores: [5,5,5] and [3,3,3] = avg 4.0 per question
        createMockFeedbackRequest('manager1', 'High Performer', [
          createMockResponse('response1', { q1: 5, q2: 5, q3: 5 }),
          createMockResponse('response2', { q1: 3, q2: 3, q3: 3 })
        ]),
        // Manager 2: 1 response, scores: [1,1,1] = avg 1.0 per question
        createMockFeedbackRequest('manager2', 'Low Performer', [
          createMockResponse('response3', { q1: 1, q2: 1, q3: 1 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={2}
        />
      );

      // With minReviewCount=2, only Manager 1 should be included
      // Overall average should be 4.0 (not influenced by Manager 2's low scores)
      const overallScore = screen.getAllByText('4.0')[0]; // Get the first instance (overall score)
      expect(overallScore).toBeInTheDocument();
      expect(screen.getByText(/Summary of manager effectiveness based on 2 responses across 1 manager/)).toBeInTheDocument();
    });

    it('shows no data when no managers meet minimum review count', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ]),
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={5}
        />
      );

      expect(screen.getByText('No feedback data available for analysis. Please collect some feedback to see manager analytics.')).toBeInTheDocument();
    });

    it('handles edge case of minReviewCount=0', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={0}
        />
      );

      // Should include all managers (even those with 0 reviews, though none exist in this test)
      expect(screen.getByText(/Summary of manager effectiveness based on 1 responses across 1 manager/)).toBeInTheDocument();
    });
  });

  describe('Employee filtering', () => {
    it('applies employee filters correctly', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ]),
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          employeeFilters={['manager1']}
        />
      );

      // Should only show 1 manager (John Doe)  
      expect(screen.getByText(/Summary of manager effectiveness based on 1 responses across 1 manager/)).toBeInTheDocument();
    });

    it('combines employee filters with review count filters', () => {
      const mockRequests = [
        // Manager 1: 3 responses (meets review count, not in employee filter)
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 }),
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 }),
          createMockResponse('response3', { q1: 5, q2: 3, q3: 4 })
        ]),
        // Manager 2: 3 responses (meets review count, in employee filter)
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response4', { q1: 3, q2: 4, q3: 2 }),
          createMockResponse('response5', { q1: 4, q2: 3, q3: 5 }),
          createMockResponse('response6', { q1: 2, q2: 5, q3: 3 })
        ]),
        // Manager 3: 1 response (doesn't meet review count, in employee filter)
        createMockFeedbackRequest('manager3', 'Bob Johnson', [
          createMockResponse('response7', { q1: 2, q2: 3, q3: 1 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          employeeFilters={['manager2', 'manager3']}
          minReviewCount={3}
        />
      );

      // Should only show 1 manager (Jane Smith - meets both filters)
      expect(screen.getByText(/Summary of manager effectiveness based on 3 responses across 1 manager/)).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('renders all three tabs', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('By Question')).toBeInTheDocument();
      expect(screen.getByText('By Manager')).toBeInTheDocument();
    });

    it('switches between tabs correctly', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      // Click on "By Question" tab
      fireEvent.click(screen.getByText('By Question'));
      
      // Should show question details - wait for tab content to load
      expect(screen.getByText('How well does this manager provide feedback and guidance?')).toBeInTheDocument();
    });
  });

  describe('Manager comparison functionality', () => {
    it('shows manager comparison chart when multiple managers exist', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ]),
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
        />
      );

      expect(screen.getByTestId('manager-comparison-chart')).toBeInTheDocument();
      expect(screen.getByText('Manager Comparison Chart with 2 managers')).toBeInTheDocument();
    });

    it('hides manager comparison chart when only one manager exists after filtering', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 }),
          createMockResponse('response2', { q1: 3, q2: 4, q3: 2 })
        ]),
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response3', { q1: 3, q2: 4, q3: 2 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={2}
        />
      );

      // Should not show comparison chart (only 1 manager meets criteria)
      expect(screen.queryByTestId('manager-comparison-chart')).not.toBeInTheDocument();
    });
  });

  describe('Question averages and distributions', () => {
    it('calculates question averages correctly with review count filtering', () => {
      const mockRequests = [
        // Manager 1: 2 responses (meets minReviewCount=2)
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 5, q2: 3, q3: 4 }),
          createMockResponse('response2', { q1: 3, q2: 5, q3: 2 })
        ]),
        // Manager 2: 1 response (doesn't meet minReviewCount=2)
        createMockFeedbackRequest('manager2', 'Jane Smith', [
          createMockResponse('response3', { q1: 1, q2: 1, q3: 1 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={2}
        />
      );

      // Switch to "By Question" tab
      fireEvent.click(screen.getByText('By Question'));

      // Question averages should only include Manager 1's responses
      // q1: (5+3)/2 = 4.0, q2: (3+5)/2 = 4.0, q3: (4+2)/2 = 3.0
      expect(screen.getByText('4.0')).toBeInTheDocument(); // Should appear for q1 and q2
      expect(screen.getByText('3.0')).toBeInTheDocument(); // Should appear for q3
    });

    it('handles empty question results when no managers meet criteria', () => {
      const mockRequests = [
        createMockFeedbackRequest('manager1', 'John Doe', [
          createMockResponse('response1', { q1: 4, q2: 5, q3: 3 })
        ])
      ];

      render(
        <ManagerSurveyAnalytics
          feedbackRequests={mockRequests}
          questionIdToTextMap={mockQuestionIdToTextMap}
          minReviewCount={5}
        />
      );

      // Should show no data message
      expect(screen.getByText('No feedback data available for analysis. Please collect some feedback to see manager analytics.')).toBeInTheDocument();
    });
  });
}); 