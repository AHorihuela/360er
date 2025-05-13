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

    // Check that generateAIReport was called with the correct survey type
    expect(generateAIReport).toHaveBeenCalledWith(
      'John Doe',
      'Developer',
      mockFeedbackRequest.feedback,
      'manager_effectiveness'
    );
  });

  it('resets timer on error', async () => {
    // Set up the rejected promise without throwing immediately
    const testError = new Error('Test error');
    
    // Use mockImplementationOnce to avoid unhandled rejection
    const originalMock = vi.mocked(generateAIReport);
    vi.mocked(generateAIReport).mockImplementationOnce(() => Promise.reject(testError));
    
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Start generating report
    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch (e) {
        // Expected error, catch it to prevent test failure
      }
    });

    // Wait for React to update state after error handling
    await vi.runAllTimersAsync();

    // Timer should be reset after error
    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    
    // Check that the toast was called with the right error message
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      description: 'Error generating report: Test error',
      variant: 'destructive'
    }));
  });
}); 