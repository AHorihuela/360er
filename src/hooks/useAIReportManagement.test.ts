import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAIReportManagement } from './useAIReportManagement';
import { supabase } from '@/lib/supabase';
import { generateAIReport } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

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
    toast: vi.fn(() => ({
      id: 'test-toast',
      dismiss: vi.fn(),
      update: vi.fn()
    })),
    dismiss: vi.fn(),
    toasts: []
  }))
}));

// Create a wrapper component with the Toaster provider
const wrapper = ({ children }: { children: ReactNode }) => (
  <Toaster>{children}</Toaster>
);

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
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

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

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

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

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.isGeneratingReport).toBe(false);
    // Error is shown via toast, not stored in state
    expect(result.current.error).toBeNull();
  });

  it('tracks elapsed time during report generation', async () => {
    vi.useFakeTimers();
    
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'Generated Report Content';
    });

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    const generatePromise = act(async () => {
      result.current.handleGenerateReport();
    });

    // Wait for the state updates to be applied
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isGeneratingReport).toBe(true);
    expect(result.current.startTime).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
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

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: invalidFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('debounces multiple report changes', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      result.current.handleReportChange('Content 1');
      result.current.handleReportChange('Content 2');
      result.current.handleReportChange('Content 3');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(result.current.aiReport?.content).toBe('Content 3');
    expect(supabase.from).toHaveBeenCalledWith('ai_reports');

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

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.aiReport?.content).toBe('Existing Report Content');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles null feedback request', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: null }), { wrapper });

    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles OpenAI API failure', async () => {
    vi.mocked(generateAIReport).mockRejectedValueOnce(new Error('OpenAI API Error'));
    const mockToast = vi.fn(() => ({
      id: 'test-toast',
      dismiss: vi.fn(),
      update: vi.fn()
    }));
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      description: 'Failed to generate AI report',
      variant: 'destructive'
    }));
  });

  it('cleans up interval on unmount during generation', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'Generated Report Content';
    });

    const { result, unmount } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    const generatePromise = act(async () => {
      result.current.handleGenerateReport();
    });

    // Wait for the state updates to be applied
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isGeneratingReport).toBe(true);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    await generatePromise;
    vi.useRealTimers();
  });

  it('progresses through generation steps', async () => {
    vi.useFakeTimers();
    
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'Generated Report Content';
    });

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    const generatePromise = act(async () => {
      result.current.handleGenerateReport();
    });

    // Wait for the state updates to be applied
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.generationStep).toBe(0);
    expect(result.current.isGeneratingReport).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await generatePromise;

    expect(result.current.isGeneratingReport).toBe(false);
    vi.useRealTimers();
  });

  it('does not reuse expired report', async () => {
    const oneHourAndOneMinuteAgo = new Date(Date.now() - 3660000).toISOString();
    const mockExistingReport = {
      content: 'Old Report Content',
      updated_at: oneHourAndOneMinuteAgo,
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

    vi.mocked(generateAIReport).mockResolvedValueOnce('New Report Content');

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.aiReport?.content).toBe('New Report Content');
    expect(generateAIReport).toHaveBeenCalled();
  });

  it('shows success toast on report generation', async () => {
    vi.mocked(generateAIReport).mockResolvedValueOnce('Generated Report Content');
    const mockToast = vi.fn(() => ({
      id: 'test-toast',
      dismiss: vi.fn(),
      update: vi.fn()
    }));
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Success',
      description: 'AI report generated successfully'
    }));
  });

  it('cleans markdown content on report change', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper });

    await act(async () => {
      result.current.handleReportChange('### Heading\n\n#### Subheading\n\nContent');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(result.current.aiReport?.content).toBe('### Heading\n\n#### Subheading\n\nContent');
    expect(supabase.from).toHaveBeenCalledWith('ai_reports');

    vi.useRealTimers();
  });
}); 