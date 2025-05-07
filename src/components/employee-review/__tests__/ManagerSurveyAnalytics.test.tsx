import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManagerSurveyAnalytics } from '../ManagerSurveyAnalytics';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import userEvent from '@testing-library/user-event';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock data for testing
const mockQuestionIdToTextMap: Record<string, string> = {
  'q1': 'I understand what is expected of me at work.',
  'q2': 'My manager contributes to my productivity.',
  'q3': 'My manager frequently provides feedback.',
  'q4': 'What could this manager do to better support the team?',
};

const mockQuestionOrder: Record<string, number> = {
  'q1': 1,
  'q2': 2,
  'q3': 3,
  'q4': 4,
};

const mockFeedbackResponses: CoreFeedbackResponse[] = [
  {
    id: 'response1',
    feedback_request_id: 'request1',
    session_id: 'session1',
    submitted_at: '2023-07-01T00:00:00Z',
    status: 'submitted',
    relationship: 'equal_colleague',
    strengths: 'Great communication',
    areas_for_improvement: 'Could delegate more',
    created_at: '2023-07-01T00:00:00Z',
    responses: {
      'q1': 5,
      'q2': 4,
      'q3': 3,
      'q4': 'Provide more feedback'
    }
  },
  {
    id: 'response2',
    feedback_request_id: 'request1',
    session_id: 'session2',
    submitted_at: '2023-07-02T00:00:00Z',
    status: 'submitted',
    relationship: 'senior_colleague',
    strengths: 'Strong technical skills',
    areas_for_improvement: 'Sometimes focuses too much on details',
    created_at: '2023-07-02T00:00:00Z',
    responses: {
      'q1': 4,
      'q2': 3,
      'q3': 2,
      'q4': 'More regular check-ins'
    }
  }
];

describe('ManagerSurveyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders the component with title and response count', () => {
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    expect(screen.getByText('Manager Effectiveness Summary')).toBeInTheDocument();
    expect(screen.getByText('2 Responses')).toBeInTheDocument();
  });

  it('calculates and displays the correct overall average', () => {
    // Average should be: (5+4+3+4+3+2)/6 = 3.5
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Find the overall score display - using a more specific query
    const overallScore = screen.getByText('3.5', {
      selector: '.text-3xl.font-bold .text-yellow-500'
    });
    expect(overallScore).toBeInTheDocument();
    expect(screen.getByText('/ 5.0')).toBeInTheDocument();
  });

  it('filters out open-ended questions from metrics calculations', () => {
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Should render three Likert questions, not the open-ended one
    expect(screen.getByText('I understand what is expected of me at work.')).toBeInTheDocument();
    expect(screen.getByText('My manager contributes to my productivity.')).toBeInTheDocument();
    expect(screen.getByText('My manager frequently provides feedback.')).toBeInTheDocument();
    
    // Open-ended question shouldn't have metrics displayed
    expect(screen.queryByText('What could this manager do to better support the team?')).not.toBeInTheDocument();
  });

  it('displays individual question averages and response counts', () => {
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // q1 average is (5+4)/2 = 4.5
    // q2 average is (4+3)/2 = 3.5
    // q3 average is (3+2)/2 = 2.5
    
    // Use more specific queries to target score elements by their context
    const questionSections = screen.getAllByText(/(I understand|My manager)/, { selector: 'h4' })
      .map(heading => heading.closest('div'));
    
    // Check for the first question's score (4.5)
    expect(questionSections[0]?.querySelector('.px-2.py-1')?.textContent).toBe('4.5');
    
    // Check for the second question's score (3.5)
    expect(questionSections[1]?.querySelector('.px-2.py-1')?.textContent).toBe('3.5');
    
    // Check for the third question's score (2.5)
    expect(questionSections[2]?.querySelector('.px-2.py-1')?.textContent).toBe('2.5');
  });

  it('toggles expanded state when header is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Initially expanded
    expect(screen.getByText('Overall Effectiveness')).toBeInTheDocument();

    // Click the header to collapse
    const header = screen.getByText('Manager Effectiveness Summary').closest('div');
    await user.click(header!);

    // Now content should be hidden
    expect(screen.queryByText('Overall Effectiveness')).not.toBeInTheDocument();

    // Click again to expand
    await user.click(header!);
    
    // Content should be visible again
    expect(screen.getByText('Overall Effectiveness')).toBeInTheDocument();
  });

  it('saves expanded state to localStorage', async () => {
    const user = userEvent.setup();
    
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Click header to collapse
    const header = screen.getByText('Manager Effectiveness Summary').closest('div');
    await user.click(header!);

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('managerSurveyAnalyticsExpanded', 'false');
  });

  it('loads expanded state from localStorage on mount', () => {
    // Set initial state in localStorage
    localStorageMock.getItem.mockReturnValueOnce('false');
    
    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockFeedbackResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Should start collapsed because we set it in localStorage
    expect(screen.queryByText('Overall Effectiveness')).not.toBeInTheDocument();
    
    // Should have checked localStorage
    expect(localStorageMock.getItem).toHaveBeenCalledWith('managerSurveyAnalyticsExpanded');
  });

  it('renders nothing when there are no feedback responses', () => {
    const { container } = render(
      <ManagerSurveyAnalytics
        feedbackResponses={[]}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Should render nothing
    expect(container).toBeEmptyDOMElement();
  });

  it('handles questions without matching response data', () => {
    const mockEmptyResponses: CoreFeedbackResponse[] = [
      {
        id: 'empty',
        feedback_request_id: 'request1',
        session_id: 'session1',
        submitted_at: '2023-07-01T00:00:00Z',
        status: 'submitted',
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: '',
        created_at: '2023-07-01T00:00:00Z',
        responses: {}
      }
    ];

    render(
      <ManagerSurveyAnalytics
        feedbackResponses={mockEmptyResponses}
        questionIdToTextMap={mockQuestionIdToTextMap}
        questionOrder={mockQuestionOrder}
      />
    );

    // Should still render the component
    expect(screen.getByText('Manager Effectiveness Summary')).toBeInTheDocument();
    
    // Look for zero as the overall score in a more specific way
    const overallScoreElement = screen.getByText('0', {
      selector: '.text-3xl.font-bold .text-red-500'
    });
    expect(overallScoreElement).toBeInTheDocument();
  });
}); 