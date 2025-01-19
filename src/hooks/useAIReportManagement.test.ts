import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAIReportManagement } from './useAIReportManagement';
import { supabase } from '@/lib/supabase';
import { generateAIReport } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { CoreFeedbackResponse } from '@/types/feedback/base';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn()
              }))
            }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      upsert: vi.fn()
    })) as unknown as PostgrestQueryBuilder<any, any, any>
  }
}));

vi.mock('@/lib/openai', () => ({
  generateAIReport: vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

describe('useAIReportManagement', () => {
  const mockFeedbackRequest: FeedbackRequest = {
    id: '123',
    unique_link: 'test-link',
    status: 'active',
    target_responses: 5,
    employee: {
      name: 'John Doe',
      role: 'Developer'
    },
    feedback: [
      {
        id: 'feedback-1',
        feedback_request_id: '123',
        session_id: 'session-1',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        status: 'submitted',
        relationship: 'senior_colleague',
        strengths: 'Great team player',
        areas_for_improvement: 'Could improve communication'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('generates a new report successfully', async () => {
    // Mock successful report generation
    vi.mocked(generateAIReport).mockResolvedValueOnce('Generated Report Content');
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null })
    } as unknown as PostgrestQueryBuilder<any, any, any>));

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.aiReport?.content).toBe('Generated Report Content');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles error during report saving', async () => {
    vi.mocked(generateAIReport).mockResolvedValueOnce('Generated Report Content');
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockRejectedValue(new Error('Database error'))
    } as unknown as PostgrestQueryBuilder<any, any, any>));

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.error).toBe('Failed to save AI report');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('tracks elapsed time during report generation', async () => {
    vi.useFakeTimers();
    const startTime = new Date();
    
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'Generated Report Content';
    });

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    const generatePromise = act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.isGeneratingReport).toBe(true);
    expect(result.current.startTime).toBeTruthy();

    await vi.advanceTimersByTimeAsync(5000);
    await generatePromise;

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    vi.useRealTimers();
  });

  it('handles invalid feedback data', async () => {
    const invalidFeedbackRequest = {
      ...mockFeedbackRequest,
      feedback: []
    };

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: invalidFeedbackRequest }));

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('debounces multiple report changes', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));
    const upsertSpy = vi.spyOn(supabase.from('ai_reports'), 'upsert');

    await act(async () => {
      result.current.handleReportChange('Content 1');
      result.current.handleReportChange('Content 2');
      result.current.handleReportChange('Content 3');
    });

    await vi.advanceTimersByTimeAsync(1100);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.aiReport?.content).toBe('Content 3');

    vi.useRealTimers();
  });

  it('reuses recent existing report', async () => {
    // Mock existing recent report
    const mockExistingReport = {
      content: 'Existing Report Content',
      updated_at: new Date().toISOString(),
      status: 'completed'
    };

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockExistingReport }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null })
    } as unknown as PostgrestQueryBuilder<any, any, any>));

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.aiReport?.content).toBe('Existing Report Content');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles null feedback request', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: null }));

    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });
}); 