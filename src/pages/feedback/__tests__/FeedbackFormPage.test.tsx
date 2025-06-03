import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { FeedbackFormPage } from '../FeedbackFormPage';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock dependencies
const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ uniqueLink: 'test-unique-link-123' }),
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock hooks
vi.mock('@/hooks/useFeedbackSubmission', () => ({
  useFeedbackSubmission: () => ({
    submitFeedback: vi.fn().mockResolvedValue(true),
    isSubmitting: false,
  }),
}));

vi.mock('@/hooks/useFeedbackFormState', () => ({
  useFeedbackFormState: () => ({
    formData: {
      relationship: 'equal_colleague',
      strengths: '',
      areas_for_improvement: ''
    },
    formState: {
      step: 'form',
      draftId: null,
      aiAnalysisAttempted: false
    },
    updateFormData: vi.fn(),
    updateFormState: vi.fn(),
    markAsSubmitted: vi.fn(),
    startSubmission: vi.fn(),
    handleSubmissionFailure: vi.fn(),
    isSubmitted: false
  }),
}));

// Mock API functions
vi.mock('@/api/surveyQuestions', () => ({
  getSurveyQuestions: vi.fn().mockResolvedValue([
    {
      id: 'q1',
      reviewCycleType: 'manager_effectiveness',
      questionText: 'My manager provides clear direction.',
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ]),
  submitSurveyResponses: vi.fn().mockResolvedValue(true),
}));

// Mock components
vi.mock('@/components/feedback/FeedbackForm', () => ({
  FeedbackForm: ({ onSubmit }: { onSubmit: () => void }) => (
    <div data-testid="feedback-form">
      <button onClick={onSubmit}>Submit Feedback</button>
    </div>
  ),
}));

vi.mock('@/components/feedback/AiFeedbackReview', () => ({
  AiFeedbackReview: ({ onSubmit }: { onSubmit: () => void }) => (
    <div data-testid="ai-feedback-review">
      <button onClick={onSubmit}>Submit After AI Review</button>
    </div>
  ),
}));

vi.mock('@/components/survey/DynamicSurveyForm', () => ({
  DynamicSurveyForm: ({ onSubmit }: { onSubmit: (responses: any) => void }) => (
    <div data-testid="dynamic-survey-form">
      <button onClick={() => onSubmit({ q1: 4 })}>Submit Survey</button>
    </div>
  ),
}));

// Mock Supabase anonymous client
const mockAnonymousClient = {
  from: vi.fn(),
};

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  anonymousClient: mockAnonymousClient,
}));

// Sample test data
const sampleFeedbackRequest = {
  id: 'req-123',
  review_cycle_id: 'cycle-123',
  employee_id: 'emp-123',
  status: 'active',
  unique_link: 'test-unique-link-123',
  target_responses: 5,
  employee: {
    id: 'emp-123',
    name: 'John Doe',
    role: 'Software Engineer',
    user_id: 'user-123'
  },
  review_cycle: {
    id: 'cycle-123',
    title: 'Q4 2023 Review',
    review_by_date: '2023-12-31',
    status: 'active',
    type: '360_review'
  },
  feedback: []
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FeedbackFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Supabase mocks
    mockAnonymousClient.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      ilike: mockIlike,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
    });

    mockIlike.mockReturnValue({
      single: mockSingle,
    });

    mockSingle.mockResolvedValue({
      data: sampleFeedbackRequest,
      error: null
    });

    // Mock feedback responses query
    mockEq.mockImplementation((field, value) => {
      if (field === 'feedback_request_id') {
        return Promise.resolve({
          data: [],
          error: null
        });
      }
      return mockEq;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Loading', () => {
    it('should show loading state initially', () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Loading feedback form...')).toBeInTheDocument();
    });

    it('should load feedback request data', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockAnonymousClient.from).toHaveBeenCalledWith('feedback_requests');
        expect(mockIlike).toHaveBeenCalledWith('unique_link', 'test-unique-link-123');
      });
    });

    it('should handle invalid feedback link', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Feedback Link Not Found')).toBeInTheDocument();
        expect(screen.getByText('This feedback link is invalid or has expired. Please check the URL and try again.')).toBeInTheDocument();
      });
    });
  });

  describe('360° Review Flow', () => {
    beforeEach(() => {
      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: '360_review'
          }
        },
        error: null
      });
    });

    it('should render 360° feedback form', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form')).toBeInTheDocument();
      });
    });

    it('should show employee name toggle button', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
        // Should show eye icon for toggling name visibility
      });
    });

    it('should handle feedback form submission', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const submitButton = screen.getByText('Submit Feedback');
        fireEvent.click(submitButton);
      });

      // Should trigger form submission
    });
  });

  describe('Manager Effectiveness Survey Flow', () => {
    beforeEach(() => {
      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: 'manager_effectiveness'
          }
        },
        error: null
      });
    });

    it('should render manager effectiveness survey', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Manager Effectiveness Survey/)).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-survey-form')).toBeInTheDocument();
      });
    });

    it('should load survey questions for manager effectiveness', async () => {
      const mockGetSurveyQuestions = vi.mocked(require('@/api/surveyQuestions').getSurveyQuestions);

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockGetSurveyQuestions).toHaveBeenCalledWith('manager_effectiveness');
      });
    });

    it('should handle survey form submission', async () => {
      const mockSubmitSurveyResponses = vi.mocked(require('@/api/surveyQuestions').submitSurveyResponses);

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const submitButton = screen.getByText('Submit Survey');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSubmitSurveyResponses).toHaveBeenCalledWith(
          'req-123',
          'equal_colleague',
          { q1: 4 },
          expect.any(String)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle feedback request fetch errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load feedback form. Please try again.",
          variant: "destructive",
        });
      });
    });

    it('should handle survey questions fetch errors', async () => {
      const mockGetSurveyQuestions = vi.mocked(require('@/api/surveyQuestions').getSurveyQuestions);
      mockGetSurveyQuestions.mockRejectedValue(new Error('API error'));

      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: 'manager_effectiveness'
          }
        },
        error: null
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should still render the page but log error
        expect(screen.getByText(/Manager Effectiveness Survey/)).toBeInTheDocument();
      });
    });

    it('should handle survey submission errors', async () => {
      const mockSubmitSurveyResponses = vi.mocked(require('@/api/surveyQuestions').submitSurveyResponses);
      mockSubmitSurveyResponses.mockRejectedValue(new Error('Submission failed'));

      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: 'manager_effectiveness'
          }
        },
        error: null
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const submitButton = screen.getByText('Submit Survey');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to submit survey. Please try again.",
          variant: "destructive",
        });
      });
    });
  });

  describe('Data Processing', () => {
    it('should clean unique link by removing trailing dashes', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({
        uniqueLink: 'test-link-with-dashes---'
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockIlike).toHaveBeenCalledWith('unique_link', 'test-link-with-dashes');
      });
    });

    it('should handle existing feedback responses', async () => {
      const existingFeedback = [
        {
          id: 'feedback-123',
          feedback_request_id: 'req-123',
          session_id: 'test-session',
          status: 'in_progress',
          strengths: 'Existing strengths',
          areas_for_improvement: 'Existing improvements',
          relationship: 'senior_colleague',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockEq.mockImplementation((field, value) => {
        if (field === 'feedback_request_id') {
          return Promise.resolve({
            data: existingFeedback,
            error: null
          });
        }
        return mockEq;
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockAnonymousClient.from).toHaveBeenCalledWith('feedback_responses');
      });
    });

    it('should redirect if feedback already submitted', async () => {
      const mockFormState = vi.mocked(require('@/hooks/useFeedbackFormState').useFeedbackFormState);
      mockFormState.mockReturnValue({
        ...mockFormState(),
        isSubmitted: true
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');
      });
    });
  });

  describe('Session Management', () => {
    it('should generate unique session ID', async () => {
      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      // Session ID should be generated and used in subsequent operations
      await waitFor(() => {
        expect(mockAnonymousClient.from).toHaveBeenCalled();
      });
    });

    it('should handle session-based draft recovery', async () => {
      const existingDraft = {
        id: 'draft-123',
        session_id: 'current-session',
        status: 'in_progress',
        strengths: 'Draft content',
        areas_for_improvement: 'Draft improvements'
      };

      mockEq.mockImplementation((field, value) => {
        if (field === 'feedback_request_id') {
          return Promise.resolve({
            data: [existingDraft],
            error: null
          });
        }
        return mockEq;
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should load existing draft
        expect(mockAnonymousClient.from).toHaveBeenCalledWith('feedback_responses');
      });
    });
  });

  describe('UI State Management', () => {
    it('should toggle employee name visibility', async () => {
      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: 'manager_effectiveness'
          }
        },
        error: null
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Manager Effectiveness Survey: John Doe/)).toBeInTheDocument();
      });

      // Find and click the toggle button
      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);

      // Name should be hidden
      expect(screen.getByText('Manager Effectiveness Survey')).toBeInTheDocument();
      expect(screen.queryByText(/John Doe/)).not.toBeInTheDocument();
    });

    it('should handle loading states correctly', async () => {
      // Mock slow response
      mockSingle.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ data: sampleFeedbackRequest, error: null }), 100)
        )
      );

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Loading feedback form...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Backward Compatibility', () => {
    it('should default to 360_review for missing review cycle type', async () => {
      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            ...sampleFeedbackRequest.review_cycle,
            type: undefined // Missing type
          }
        },
        error: null
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form')).toBeInTheDocument();
      });
    });

    it('should handle legacy review cycles without type field', async () => {
      mockSingle.mockResolvedValue({
        data: {
          ...sampleFeedbackRequest,
          review_cycle: {
            id: 'cycle-123',
            title: 'Legacy Review',
            review_by_date: '2023-12-31',
            status: 'active'
            // No type field
          }
        },
        error: null
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should default to 360° review
        expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should handle missing unique link parameter', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({});

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Feedback Link Not Found')).toBeInTheDocument();
      });
    });

    it('should handle malformed unique link', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({
        uniqueLink: ''
      });

      render(<FeedbackFormPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load feedback form. Please try again.",
          variant: "destructive",
        });
      });
    });
  });
});