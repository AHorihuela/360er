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
  useToast: () => ({
    toast: mockToast,
    toasts: mockToasts,
    dismiss: mockDismiss
  })
}));

vi.mock('../utils/report', () => ({
  cleanMarkdownContent: vi.fn()
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
    
    vi.mocked(useToastModule.useToast).mockReturnValue({
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
      update: () => Promise.resolve({ error: null }),
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
    const { result, unmount } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
      unmount();
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.generationStep).toBe(0);
  });

  it('progresses through generation steps', async () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
    });

    expect(result.current.generationStep).toBe(1);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.generationStep).toBe(2);
  });

  it('does not reuse expired report', async () => {
    // Mock Supabase response for expired report
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: '123',
          content: 'Old Report Content',
          status: 'completed',
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
        }
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    } as any);

    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
    });

    expect(generateAIReport).toHaveBeenCalled();
  });

  it('shows success toast on report generation', async () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Report generated successfully',
      description: 'The AI report has been generated and saved.',
      variant: 'default'
    });
  });

  it('cleans markdown content on report change', async () => {
    const { result } = renderHook(() => useAIReportManagement({ feedbackRequest: mockFeedbackRequest }), {
      wrapper: Wrapper
    });

    await act(async () => {
      result.current.handleReportChange('### Test Content');
      await vi.advanceTimersByTime(1100); // Wait for debounce
      await vi.runAllTimersAsync();
    });

    expect(supabase.from).toHaveBeenCalledWith('ai_reports');
    expect(vi.mocked(supabase.from).mock.results[0].value.update).toHaveBeenCalledWith({
      content: '### Test Content',
      updated_at: expect.any(String)
    });
  });
}); 