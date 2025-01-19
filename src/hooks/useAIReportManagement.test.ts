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

  it('handles report generation error', async () => {
    // Mock failed report generation
    vi.mocked(generateAIReport).mockRejectedValueOnce(new Error('API Error'));
    
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.error).toBe('Failed to generate AI report');
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

  it('saves report changes with debounce', async () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }));

    await act(async () => {
      result.current.handleReportChange('Updated Content');
    });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(supabase.from).toHaveBeenCalledWith('ai_reports');
  });

  it('handles null feedback request', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: null }));

    expect(result.current.aiReport).toBeNull();
    expect(result.current.error).toBeNull();
  });
}); 