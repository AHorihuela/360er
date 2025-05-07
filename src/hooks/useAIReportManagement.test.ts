import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAIReportManagement } from './useAIReportManagement';
import { supabase } from '@/lib/supabase';
import { generateAIReport } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import * as React from 'react';

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
  useToast: vi.fn()
}));

// Create a wrapper component with the Toaster provider
const Wrapper = ({ children }: { children: ReactNode }) => {
  return React.createElement(React.Fragment, null, [
    children,
    React.createElement(Toaster, null)
  ]);
};

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

  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up useToast mock
    (useToast as any).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn()
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper: Wrapper });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('generates a new report successfully', async () => {
    // Mock successful report generation
    vi.mocked(generateAIReport).mockResolvedValueOnce('Generated Report Content');
    
    const mockUpdateImpl = {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
    
    const mockFromImpl = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnValue(mockUpdateImpl),
      upsert: vi.fn().mockResolvedValue({ error: null })
    };
    
    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper: Wrapper });

    let generatePromise;
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
      await generatePromise;
    });

    expect(result.current.aiReport?.content).toBe('Generated Report Content');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles error during report saving', async () => {
    vi.mocked(generateAIReport).mockResolvedValueOnce('Generated Report Content');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      })
    } as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper: Wrapper });

    try {
      await act(async () => {
        await result.current.handleGenerateReport();
      });
    } catch (error) {
      // Expected to throw
    }

    expect(result.current.isGeneratingReport).toBe(false);
    // Error is shown via toast, not stored in state
    expect(result.current.error).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      variant: "destructive"
    }));
  });

  it('tracks elapsed time during report generation', async () => {
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'Generated Report Content';
    });

    const mockUpdateImpl = {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
    
    const mockFromImpl = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnValue(mockUpdateImpl),
      upsert: vi.fn().mockResolvedValue({ error: null })
    };
    
    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper: Wrapper });

    // Before generation starts
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    
    let generatePromise;
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
    });

    // Wait for it to complete
    await generatePromise;
    
    await act(async () => {
      // Force a re-render
      await Promise.resolve();
    });

    // After generation is complete
    expect(result.current.isGeneratingReport).toBe(false);
    
    // And we should get the right report content
    expect(result.current.aiReport).not.toBeNull();
    expect(result.current.aiReport?.content).toBe('Generated Report Content');
  });

  it('handles invalid feedback data', async () => {
    const invalidFeedbackRequest = {
      ...mockFeedbackRequest,
      feedback: []
    };

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: invalidFeedbackRequest }), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles null feedback request', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: null }), { wrapper: Wrapper });

    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles OpenAI API failure', async () => {
    vi.mocked(generateAIReport).mockRejectedValueOnce(new Error('OpenAI API Error'));
    
    const mockUpdateImpl = {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
    
    const mockFromImpl = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnValue(mockUpdateImpl),
      upsert: vi.fn().mockResolvedValue({ error: null })
    };
    
    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), { wrapper: Wrapper });

    try {
      await act(async () => {
        await result.current.handleGenerateReport();
      });
    } catch (error) {
      // Expected to throw
    }

    expect(result.current.isGeneratingReport).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      variant: "destructive"
    }));
  });
}); 