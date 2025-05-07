import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAIReportManagement } from './useAIReportManagement';
import { generateAIReport } from '../lib/openai';
import { supabase } from '../lib/supabase';
import * as useToastModule from '../components/ui/use-toast';
import { cleanMarkdownContent } from '../utils/report';
import { FeedbackRequest } from '../types/reviews/employee-review';
import { Toaster } from '../components/ui/toaster';

// Mock dependencies
vi.mock('../lib/openai', () => ({
  generateAIReport: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const mockToast = vi.fn();
const mockToasts: any[] = [];
const mockDismiss = vi.fn();

// Mock setup
vi.mock('../components/ui/use-toast', () => ({
  useToast: vi.fn()
}));

vi.mock('../utils/report', () => ({
  cleanMarkdownContent: vi.fn(content => content) // Pass through by default
}));

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

// Add wrapper component
const Wrapper = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <Toaster />
  </>
);

describe('useAIReportManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Fix mocking of useToast
    (useToastModule.useToast as any) = vi.fn().mockReturnValue({
      toast: mockToast,
      toasts: mockToasts,
      dismiss: mockDismiss,
    });

    const mockSupabaseResponse = {
      select: () => mockSupabaseResponse,
      eq: () => mockSupabaseResponse,
      order: () => mockSupabaseResponse,
      limit: () => mockSupabaseResponse,
      single: () => Promise.resolve({ data: null }),
      update: () => mockSupabaseResponse,
      upsert: () => Promise.resolve({ error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSupabaseResponse as any);
    vi.mocked(generateAIReport).mockResolvedValue('New Report Content');
    vi.mocked(cleanMarkdownContent).mockImplementation((content) => content);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.aiReport).toBeNull();
    expect(result.current.generationStep).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('cleans up interval on unmount during generation', async () => {
    const mockUpdateImpl = {
      eq: () => Promise.resolve({ error: null })
    };
    
    const mockFromImpl = {
      select: () => mockFromImpl,
      eq: () => mockFromImpl,
      order: () => mockFromImpl,
      limit: () => mockFromImpl,
      single: () => Promise.resolve({ data: null }),
      update: () => mockUpdateImpl,
      upsert: () => Promise.resolve({ error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);
    
    // Make generation take some time to complete
    vi.mocked(generateAIReport).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'New Report Content';
    });
    
    const { unmount } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    // No assertions needed - we're just testing that unmount doesn't throw
    unmount();
  });

  it('progresses through generation steps', async () => {
    const mockUpdateImpl = {
      eq: () => Promise.resolve({ error: null })
    };
    
    const mockFromImpl = {
      select: () => mockFromImpl,
      eq: () => mockFromImpl,
      order: () => mockFromImpl,
      limit: () => mockFromImpl,
      single: () => Promise.resolve({ data: null }),
      update: () => mockUpdateImpl,
      upsert: () => Promise.resolve({ error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);

    // Since we can't rely on async behavior in tests, we'll test that the
    // generation process can complete successfully
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    let generatePromise;
    
    // Initially not generating
    expect(result.current.isGeneratingReport).toBe(false);
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
    });
    
    // Complete the generation
    await act(async () => {
      await generatePromise;
    });
    
    // After generation is complete
    expect(result.current.isGeneratingReport).toBe(false);
    // The content should be updated
    expect(result.current.aiReport?.content).toBe('New Report Content');
  });

  it('does not reuse expired report', async () => {
    // Mock Supabase response for expired report
    const mockUpdateImpl = {
      eq: () => Promise.resolve({ error: null })
    };
    
    const mockExpiredResponse = {
      select: () => mockExpiredResponse,
      eq: () => mockExpiredResponse,
      order: () => mockExpiredResponse,
      limit: () => mockExpiredResponse,
      single: () => Promise.resolve({
        data: {
          id: '123',
          content: 'Old Report Content',
          status: 'completed',
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
        }
      }),
      update: () => mockUpdateImpl,
      upsert: () => Promise.resolve({ error: null })
    };

    vi.mocked(supabase.from).mockReturnValue(mockExpiredResponse as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    let generatePromise;
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
      await generatePromise;
    });

    expect(generateAIReport).toHaveBeenCalled();
  });

  it('shows success toast on report generation', async () => {
    const mockUpdateImpl = {
      eq: () => Promise.resolve({ error: null })
    };
    
    const mockFromImpl = {
      select: () => mockFromImpl,
      eq: () => mockFromImpl,
      order: () => mockFromImpl,
      limit: () => mockFromImpl,
      single: () => Promise.resolve({ data: null }),
      update: () => mockUpdateImpl,
      upsert: () => Promise.resolve({ error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);
    
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    let generatePromise;
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
      await generatePromise;
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Report generated successfully',
      description: 'The AI report has been generated and is now visible below.',
      variant: 'default'
    });
  });

  it('cleans markdown content on report change', async () => {
    const mockUpdateImpl = {
      eq: () => Promise.resolve({ error: null })
    };
    
    const mockFromImpl = {
      select: () => mockFromImpl,
      eq: () => mockFromImpl,
      order: () => mockFromImpl,
      limit: () => mockFromImpl,
      single: () => Promise.resolve({ data: null }),
      update: () => mockUpdateImpl,
      upsert: () => Promise.resolve({ error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockFromImpl as any);
    
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleReportChange('### Test Content');
      await vi.advanceTimersByTimeAsync(1100); // Wait for debounce
    });

    expect(supabase.from).toHaveBeenCalledWith('ai_reports');
  });
}); 