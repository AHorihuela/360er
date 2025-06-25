import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFeedbackSubmission } from '../useFeedbackSubmission';
import { FeedbackFormData } from '@/types/feedback/form';
import { SubmissionOptions } from '@/types/feedback/submission';

// Simple mock setup
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockToast = vi.fn();
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  anonymousClient: {
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect
    }))
  }
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('useFeedbackSubmission - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup successful responses by default
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'response-123' }],
        error: null
      })
    });
    
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'request-123' }],
        error: null
      })
    });
    
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'request-123', status: 'pending' },
          error: null
        })
      })
    });
  });

  it('should handle missing required data gracefully', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: 'Good work',
      areas_for_improvement: 'Needs improvement'
    };

    const options: SubmissionOptions = {
      feedbackRequestId: '', // Missing
      uniqueLink: 'abc123',
      sessionId: 'session-456'
    };

    let submissionResult: boolean | undefined;

    await act(async () => {
      submissionResult = await result.current.submitFeedback(formData, options);
    });

    expect(submissionResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Error",
      description: "Missing required data for submission. Please try again.",
      variant: "destructive"
    });
  });

  it('should return true for successful submission when required data is present', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: 'Great communication skills and teamwork',
      areas_for_improvement: 'Could improve time management'
    };

    const options: SubmissionOptions = {
      feedbackRequestId: 'request-123',
      uniqueLink: 'abc123',
      sessionId: 'session-456'
    };

    let submissionResult: boolean | undefined;

    await act(async () => {
      submissionResult = await result.current.submitFeedback(formData, options);
    });

    expect(submissionResult).toBe(true);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Success",
      description: "Thank you! Your feedback has been submitted successfully.",
      variant: "default"
    });
    expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');
  });

  it('should track submission state correctly', () => {
    const { result } = renderHook(() => useFeedbackSubmission());
    
    // Initially not submitting
    expect(result.current.isSubmitting).toBe(false);
    
    // The state management is internal to the hook during submission
    // We can only test the public interface here
    expect(typeof result.current.submitFeedback).toBe('function');
  });

  it('should handle database errors gracefully', async () => {
    // Override mock to simulate error
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
    });

    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: 'Good work',
      areas_for_improvement: 'Needs improvement'
    };

    const options: SubmissionOptions = {
      feedbackRequestId: 'request-123',
      uniqueLink: 'abc123',
      sessionId: 'session-456'
    };

    let submissionResult: boolean | undefined;

    await act(async () => {
      submissionResult = await result.current.submitFeedback(formData, options);
    });

    expect(submissionResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to submit feedback. Please try again.",
      variant: "destructive"
    });
  });

  it('should handle all relationship types', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const relationshipTypes = ['senior_colleague', 'equal_colleague', 'junior_colleague'] as const;

    for (const relationship of relationshipTypes) {
      const formData: FeedbackFormData = {
        relationship,
        strengths: `Strengths for ${relationship}`,
        areas_for_improvement: `Improvements for ${relationship}`
      };

      const options: SubmissionOptions = {
        feedbackRequestId: `request-${relationship}`,
        uniqueLink: `link-${relationship}`,
        sessionId: `session-${relationship}`
      };

      let submissionResult: boolean | undefined;

      await act(async () => {
        submissionResult = await result.current.submitFeedback(formData, options);
      });

      expect(submissionResult).toBe(true);
    }
  });

  it('should properly handle empty feedback content', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: '',
      areas_for_improvement: ''
    };

    const options: SubmissionOptions = {
      feedbackRequestId: 'request-123',
      uniqueLink: 'abc123',
      sessionId: 'session-456'
    };

    let submissionResult: boolean | undefined;

    await act(async () => {
      submissionResult = await result.current.submitFeedback(formData, options);
    });

    // Should still submit (validation is handled at form level)
    expect(submissionResult).toBe(true);
  });

  it('should handle special characters in feedback', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: 'Excellent work with émojis 🎉 and "quotes" & symbols!',
      areas_for_improvement: 'Could improve résumé writing & SQL queries (SELECT * FROM table;)'
    };

    const options: SubmissionOptions = {
      feedbackRequestId: 'request-123',
      uniqueLink: 'abc123',
      sessionId: 'session-456'
    };

    let submissionResult: boolean | undefined;

    await act(async () => {
      submissionResult = await result.current.submitFeedback(formData, options);
    });

    expect(submissionResult).toBe(true);
  });

  it('should track submitted feedback in localStorage', async () => {
    const { result } = renderHook(() => useFeedbackSubmission());

    const formData: FeedbackFormData = {
      relationship: 'equal_colleague',
      strengths: 'Good work',
      areas_for_improvement: 'Needs improvement'
    };

    const options: SubmissionOptions = {
      feedbackRequestId: 'request-123',
      uniqueLink: 'unique-link-123',
      sessionId: 'session-456'
    };

    await act(async () => {
      await result.current.submitFeedback(formData, options);
    });

    // Check that submission was tracked in localStorage
    const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
    expect(submittedFeedbacks['unique-link-123']).toBe(true);
  });
}); 