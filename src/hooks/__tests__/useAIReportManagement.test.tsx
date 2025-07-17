import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAIReportManagement } from '../useAIReportManagement';
import { supabase } from '../../lib/supabase';
import { FeedbackRequest } from '@/types/reviews/employee-review';
import { ReactNode } from 'react';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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
    from: vi.fn((table) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'master' },
                error: null
              })
            }))
          }))
        };
      }
      
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '123',
                review_cycle_id: 'cycle-123',
                review_cycles: { user_id: 'test-user-id' }
              },
              error: null
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'master' },
              error: null
            })
          }))
        })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      };
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

// Mock survey questions API
vi.mock('../../api/surveyQuestions', () => ({
  getSurveyQuestions: vi.fn().mockResolvedValue({})
}));

// Create a wrapper component for the hook
const Wrapper = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>;
};

describe('useAIReportManagement', () => {
  const mockFeedbackRequest: FeedbackRequest = {
    id: '123',
    unique_link: 'test-link',
    status: 'active',
    target_responses: 5,
    employee: {
      name: 'John Doe',
      role: 'Software Engineer'
    },
    feedback: [
      {
        id: '1',
        feedback_request_id: '123',
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        session_id: 'session-1',
        created_at: new Date().toISOString(),
        relationship: 'peer',
        strengths: 'Good teamwork',
        areas_for_improvement: 'Some feedback'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Set up default successful fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: 'Mocked AI Report Content' })
    });
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
    expect(result.current.error).toBeNull();
    expect(result.current.generationStep).toBe(0);
    expect(result.current.startTime).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('verifies basic timer functionality during report generation', async () => {
    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: mockFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    // Start generation
    act(() => {
      result.current.handleGenerateReport();
    });

    // Check that generation has started
    expect(result.current.isGeneratingReport).toBe(true);

    // Complete generation with limited timer advancement
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow promises to resolve
    });
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
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.generationStep).toBe(0);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.startTime).toBeNull();
  });

  it('passes the survey type to the server API', async () => {
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

    // Verify the fetch was called correctly (check key parts of the call)
    expect(mockFetch).toHaveBeenCalledWith('/api/generate-report', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }));
    
    // Verify the request body contains the survey type
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.surveyType).toBe('manager_effectiveness');
    expect(requestBody.employeeName).toBe('John Doe');
    expect(requestBody.employeeRole).toBe('Software Engineer');
  });

  it('handles errors during report generation', async () => {
    // Mock fetch to return an error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ details: 'API Error' })
    });

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
    // Mock fetch to return an error
    mockFetch.mockRejectedValueOnce(new Error('Generation failed'));

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
      variant: 'destructive',
    });
  });

  it('allows master accounts to generate reports for feedback requests they do not own', async () => {
    const otherUserFeedbackRequest = {
      ...mockFeedbackRequest,
      id: 'other-123'
    };

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: otherUserFeedbackRequest,
      surveyType: '360_review'
    }), {
      wrapper: Wrapper
    });

    await act(async () => {
      const promise = result.current.handleGenerateReport();
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(result.current.aiReport?.content).toBe('Mocked AI Report Content');
    expect(result.current.error).toBeNull();
  });

  it('denies access to non-master accounts for feedback requests they do not own', async () => {
    // Mock user role as non-master by making the master role query return null
    const mockSupabase = vi.mocked(supabase);
    
    // Temporarily override the user_roles query to return no master role
    const originalFrom = mockSupabase.from.getMockImplementation();
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // No master role found
                error: null
              })
            }))
          }))
        } as any;
      }
      // For other tables, use a simple mock
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'other-123', review_cycle_id: 'different-cycle', review_cycles: { user_id: 'different-user' } },
              error: null
            })
          }))
        }))
      } as any;
    });

    const otherUserFeedbackRequest = {
      ...mockFeedbackRequest,
      id: 'other-123'
    };

    const { result } = renderHook(() => useAIReportManagement({ 
      feedbackRequest: otherUserFeedbackRequest,
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

    expect(result.current.error).toBe('Error generating report: Access denied: You do not own this feedback request.');
    expect(result.current.aiReport).toBeNull();
    
    // Restore original mock
    if (originalFrom) {
      mockSupabase.from.mockImplementation(originalFrom);
    }
  });
}); 