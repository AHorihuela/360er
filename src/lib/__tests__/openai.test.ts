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

    // After security patch, this function throws an error
    await expect(
      generateAIReport('John Doe', 'Manager', mockFeedbackResponses, '360_review')
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
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

    // After security patch, this function throws an error
    await expect(
      generateAIReport('Jane Doe', 'Manager', mockFeedbackResponses, 'manager_effectiveness')
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
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

    // After security patch, this function throws an error
    await expect(
      generateAIReport('John Doe', 'Manager', mockFeedbackResponses)
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
  });

  it('handles empty feedback responses gracefully', async () => {
    const mockEmptyResponses: CoreFeedbackResponse[] = [];

    // After security patch, this function throws an error
    await expect(
      generateAIReport('John Doe', 'Manager', mockEmptyResponses, 'manager_effectiveness')
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
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

    // After security patch, this function throws an error
    await expect(
      generateAIReport('', '', mockFeedbackResponses, 'manager_effectiveness')
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
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

    // After security patch, this function throws an error
    await expect(
      generateAIReport(
        'Jane Doe', 
        'Manager', 
        mockFeedbackResponses, 
        'manager_effectiveness',
        surveyQuestions
      )
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
  });

  it('throws an error indicating the function has been moved server-side for security', async () => {
    const mockFeedback = [
      {
        id: '1',
        strengths: 'Great team player',
        areas_for_improvement: 'Could improve time management',
        reviewer_relationship: 'peer' as const,
        feedback_request_id: 'req-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        submitted_at: '2024-01-01T00:00:00Z',
        status: 'completed' as const,
        session_id: 'session-1',
        relationship: 'peer' as const,
        severity: 'normal' as const
      }
    ];

    await expect(
      generateAIReport(
        'John Doe',
        'Software Engineer',
        mockFeedback,
        '360_review'
      )
    ).rejects.toThrow('generateAIReport has been moved to server-side for security');
  });

  it('provides guidance on using the server-side endpoint', async () => {
    await expect(
      generateAIReport(
        'Jane Smith',
        'Product Manager',
        [],
        'manager_effectiveness'
      )
    ).rejects.toThrow('Use /api/generate-report endpoint instead');
  });

  // Test that all function signatures still work (for backward compatibility)
  it('maintains function signature compatibility', async () => {
    const testCall = () => generateAIReport(
      'Test Employee',
      'Test Role',
      [],
      'manager_effectiveness',
      { 'q1': 'Question 1' }
    );

    // Should reject but not throw synchronously
    await expect(testCall()).rejects.toThrow();
  });
}); 