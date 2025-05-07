import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAIReportManagement } from '../useAIReportManagement';
import { generateAIReport } from '../../lib/openai';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('../../lib/openai', () => ({
  generateAIReport: vi.fn().mockResolvedValue('Mocked AI Report Content')
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      })
    })
  }
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
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
const Wrapper = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
};

describe('useAIReportManagement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.aiReport).toBeNull();
    expect(result.current.generationStep).toBe(0);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('updates elapsedSeconds while report is generating', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Start generating report but don't resolve the promise yet
    let generatePromise: Promise<any>;
    
    await act(async () => {
      generatePromise = result.current.handleGenerateReport();
    });

    // Check that timer started
    expect(result.current.isGeneratingReport).toBe(true);
    expect(result.current.startTime).not.toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);

    // Advance time and check that elapsedSeconds updates
    await act(async () => {
      vi.advanceTimersByTime(1000); // 1 second
    });
    
    expect(result.current.elapsedSeconds).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(2000); // 2 more seconds (total 3)
    });
    
    expect(result.current.elapsedSeconds).toBe(3);

    // Complete generation
    await act(async () => {
      await generatePromise;
    });

    // Should reset timer after completion
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('resets timer values when report generation completes', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    // Should be reset after completion
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    
    // Report should be set
    expect(result.current.aiReport).not.toBeNull();
    expect(result.current.aiReport?.content).toBe('Mocked AI Report Content');
  });

  it('passes the survey type to generateAIReport', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: 'manager_effectiveness'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    // Check that generateAIReport was called with the correct survey type
    expect(generateAIReport).toHaveBeenCalledWith(
      'John Doe',
      'Developer',
      mockFeedbackRequest.feedback,
      'manager_effectiveness'
    );
  });

  it('resets timer on error', async () => {
    // Mock an error for this test
    (generateAIReport as any).mockRejectedValueOnce(new Error('Test error'));

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch (error) {
        // Expected error
      }
    });

    // Timer should be reset
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    
    // Error toast should be shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      description: "Failed to generate AI report",
      variant: "destructive",
    }));
  });
}); 