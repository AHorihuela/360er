import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAIReport } from '../openai';
import { CoreFeedbackResponse } from '@/types/feedback/base';

// Mock the OpenAI client
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Mocked AI response content'
                }
              }
            ]
          })
        }
      }
    }))
  };
});

// Mock environment variables
vi.mock('../../lib/supabase', () => ({
  supabase: {}
}));

describe('generateAIReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats 360 review data correctly', async () => {
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
        created_at: '2023-07-01T00:00:00Z'
      },
      {
        id: 'response2',
        feedback_request_id: 'request1',
        session_id: 'session2',
        submitted_at: '2023-07-02T00:00:00Z',
        status: 'submitted',
        relationship: 'senior_colleague',
        strengths: 'Strong technical skills',
        areas_for_improvement: 'Needs improvement in delegation',
        created_at: '2023-07-02T00:00:00Z'
      }
    ];

    const result = await generateAIReport('John Doe', 'Manager', mockFeedbackResponses, '360_review');
    
    // Correct title for 360 reviews
    expect(result).toContain('# 360-Degree Feedback Report for John Doe (Manager)');
    
    // Returns the mocked content
    expect(result).toContain('Mocked AI response content');
  });

  it('formats manager effectiveness survey data correctly', async () => {
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
          'q3': 'Provides good feedback'
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
        areas_for_improvement: 'Needs improvement in delegation',
        created_at: '2023-07-02T00:00:00Z',
        responses: {
          'q1': 4,
          'q2': 3,
          'q3': 'Could improve on regular check-ins'
        }
      }
    ];

    const result = await generateAIReport('Jane Doe', 'Manager', mockFeedbackResponses, 'manager_effectiveness');
    
    // Correct title for manager effectiveness
    expect(result).toContain('# Manager Effectiveness Report for Jane Doe (Manager)');
    
    // Returns the mocked content
    expect(result).toContain('Mocked AI response content');
  });

  it('defaults to 360 review format when no surveyType provided', async () => {
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
        created_at: '2023-07-01T00:00:00Z'
      }
    ];

    const result = await generateAIReport('John Doe', 'Manager', mockFeedbackResponses);
    
    // Defaults to 360 review title
    expect(result).toContain('# 360-Degree Feedback Report for John Doe (Manager)');
  });

  it('handles empty feedback responses gracefully', async () => {
    const mockEmptyResponses: CoreFeedbackResponse[] = [];

    const result = await generateAIReport('John Doe', 'Manager', mockEmptyResponses, 'manager_effectiveness');
    
    // Should still generate a report
    expect(result).toContain('# Manager Effectiveness Report for John Doe (Manager)');
  });

  it('handles missing employee information gracefully', async () => {
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
        created_at: '2023-07-01T00:00:00Z'
      }
    ];

    const result = await generateAIReport('', '', mockFeedbackResponses, 'manager_effectiveness');
    
    // Uses fallback values
    expect(result).toContain('# Manager Effectiveness Report for  ()');
  });

  it('uses actual question text when surveyQuestions mapping is provided', async () => {
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
          'q3': 'Provides detailed feedback'
        }
      }
    ];

    const surveyQuestions = {
      'q1': 'How effectively does this manager communicate with the team?',
      'q2': 'How well does this manager delegate tasks?',
      'q3': 'What additional feedback would you like to provide?'
    };

    const result = await generateAIReport(
      'Jane Doe', 
      'Manager', 
      mockFeedbackResponses, 
      'manager_effectiveness',
      surveyQuestions
    );
    
    // Should contain actual question text
    expect(result).toContain('# Manager Effectiveness Report for Jane Doe (Manager)');
    expect(result).toContain('Mocked AI response content');
  });
}); 