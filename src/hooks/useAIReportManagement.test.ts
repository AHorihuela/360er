import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAIReportManagement } from './useAIReportManagement';
import { generateAIReport } from '../lib/openai';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { ReactNode } from 'react';

// Mock dependencies with a delayed promise resolution
vi.mock('../lib/openai', () => ({
  generateAIReport: vi.fn().mockImplementation(() => {
    return new Promise(resolve => {
      // Add a delay to simulate API call
      setTimeout(() => resolve('Mocked AI Report Content'), 500);
    });
  })
}));

vi.mock('../lib/supabase', () => ({
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
vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock the Toaster component
vi.mock('../components/ui/toaster', () => ({
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

// Simple wrapper without Toaster to avoid DOM warnings
const Wrapper = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
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

  it('generates a new report successfully', async () => {
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

    expect(result.current.aiReport).not.toBeNull();
    expect(result.current.aiReport?.content).toBe('Mocked AI Report Content');
    expect(result.current.isGeneratingReport).toBe(false);
  });

  it('handles error during report saving', async () => {
    // Mock a database error
    const mockFromImplWithError = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('Database error'))
      })
    });
    
    // Override the supabase mock for this test only
    const originalFrom = vi.mocked(require('../lib/supabase').supabase.from);
    vi.mocked(require('../lib/supabase').supabase.from).mockImplementation(mockFromImplWithError);

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch (e) {
        // Expected error, catch it
      }
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.error).toContain('Error generating report');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      variant: "destructive",
    }));
    
    // Restore the original mock
    vi.mocked(require('../lib/supabase').supabase.from).mockImplementation(originalFrom);
  });

  it('tracks elapsed time during report generation', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    let promise: Promise<void>;
    
    await act(async () => {
      promise = result.current.handleGenerateReport();
      expect(result.current.isGeneratingReport).toBe(true);
      expect(result.current.startTime).not.toBeNull();
      
      // Skip ahead a bit
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.startTime).toBeNull();
  });

  it('handles OpenAI API failure', async () => {
    // Save original implementation
    const originalImplementation = vi.mocked(generateAIReport);
    
    // Override for this test only
    vi.mocked(generateAIReport).mockRejectedValueOnce(new Error('OpenAI API Error'));

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Act with error handling
    await act(async () => {
      try {
        await result.current.handleGenerateReport();
      } catch (e) {
        // Expected error, catch it here
      }
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.error).toBe('Error generating report: OpenAI API Error');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      description: "Error generating report: OpenAI API Error",
      variant: "destructive",
    }));
    
    // Restore original implementation
    vi.mocked(generateAIReport).mockImplementation(originalImplementation);
  });
}); 