import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAIReportManagement } from '../useAIReportManagement';
import { generateAIReport } from '../../lib/openai';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { ReactNode } from 'react';

// Mock dependencies with a delayed promise resolution
vi.mock('../../lib/openai', () => ({
  generateAIReport: vi.fn().mockImplementation(() => {
    return new Promise(resolve => {
      // Add a delay to simulate API call
      setTimeout(() => resolve('Mocked AI Report Content'), 500);
    });
  })
}));

// Mock Supabase - define inline to avoid hoisting issues
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null
      }),
      refreshSession: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '123',
              review_cycle_id: 'cycle-123',
              review_cycles: { user_id: 'test-user-id' }
            },
            error: null
          })
        }))
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock the toaster component to prevent React rendering issues
vi.mock('../../components/ui/toaster', () => ({
  Toaster: () => null
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

// Simplified wrapper that doesn't include the problematic Toaster component
const Wrapper = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

describe('useAIReportManagement', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
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

  it('verifies basic timer functionality during report generation', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Check initial state
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isGeneratingReport).toBe(false);
    
    // Start generating report but don't await its completion
    let generatePromise: Promise<void>;
    
    await act(async () => {
      // Start the generation process
      generatePromise = result.current.handleGenerateReport();
      
      // Allow the first part of the process to execute
      await vi.advanceTimersByTimeAsync(100);
    });
    
    // Check that generation has started
    expect(result.current.isGeneratingReport).toBe(true);
    
    // Complete generation with limited timer advancement
    await act(async () => {
      // Advance just enough to complete the mocked API call (500ms)
      await vi.advanceTimersByTimeAsync(500);
      try {
        await generatePromise;
      } catch (e) {
        // Ignore errors for this test
        console.error('Error during test:', e);
      }
    });

    // Verify timer resets after completion
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('resets timer values when report generation completes', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      const promise = result.current.handleGenerateReport();
      // Advance time to complete the generation
      await vi.runAllTimersAsync();
      await promise;
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
      const promise = result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(generateAIReport).toHaveBeenCalledWith(
      mockFeedbackRequest.employee?.name,
      mockFeedbackRequest.employee?.role,
      mockFeedbackRequest.feedback,
      'manager_effectiveness',
      undefined
    );
  });

  it('handles errors during report generation', async () => {
    // Mock generateAIReport to throw an error
    const mockGenerateAIReport = vi.mocked(generateAIReport);
    mockGenerateAIReport.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch {
        // Expected error
      }
      await vi.runAllTimersAsync();
    });

    expect(result.current.error).toBe('Error generating report: API Error');
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.aiReport).toBeNull();
  });



  it('shows success toast when report is generated', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      const promise = result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Report generated successfully',
      description: 'The AI report has been generated and is now visible below.',
      variant: 'default'
    });
  });

  it('shows error toast when generation fails', async () => {
    const mockGenerateAIReport = vi.mocked(generateAIReport);
    mockGenerateAIReport.mockRejectedValueOnce(new Error('Generation failed'));

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch {
        // Expected error
      }
      await vi.runAllTimersAsync();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Error generating report: Generation failed',
      variant: 'destructive'
    });
  });
}); 