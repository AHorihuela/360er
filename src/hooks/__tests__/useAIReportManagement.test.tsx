import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // Override the mock for this specific test with a longer delay
    (generateAIReport as any).mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve('Mocked AI Report Content'), 2000);
      });
    });
    
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Initially timer should be at zero
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isGeneratingReport).toBe(false);
    
    // Start generating report
    const generatePromise = result.current.handleGenerateReport();
    
    // Force update to ensure state changes are applied
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Verify timer has started
    expect(result.current.isGeneratingReport).toBe(true);
    expect(result.current.startTime).not.toBeNull();
    
    // Advance time and verify timer increments (without checking exact value)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    
    // Just verify timer is counting (non-zero), not the exact value
    expect(result.current.elapsedSeconds).toBeGreaterThan(0);

    // Complete generation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await generatePromise;
    });

    // Verify timer resets after completion
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
      const promise = result.current.handleGenerateReport();
      // Advance time to complete the generation
      await vi.advanceTimersByTimeAsync(600);
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
      await vi.advanceTimersByTimeAsync(600);
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
    const mockedRejection = Promise.reject(testError);
    
    // Mock implementation that returns a rejected promise
    (generateAIReport as any).mockImplementationOnce(() => mockedRejection);
    
    // Already handle the rejection to prevent unhandled promise rejection
    mockedRejection.catch(() => {}); // Silently catch to avoid unhandled rejection

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Act with error catch inside
    await act(async () => {
      const promise = result.current.handleGenerateReport().catch(e => {
        // Expected error, catch it here
        expect(e.message).toBe('Test error');
      });
      
      await vi.advanceTimersByTimeAsync(100);
      await promise;
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