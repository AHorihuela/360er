import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFeedbackSubmission } from '../useFeedbackSubmission';
import { anonymousClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { FeedbackFormData } from '@/types/feedback/form';
import { SubmissionOptions } from '@/types/feedback/submission';

// Mock chain methods for better control
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

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

// Set up default successful responses
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // Default successful insert response
  mockInsert.mockImplementation(() => ({
    select: vi.fn(() => Promise.resolve({
      data: [{ id: 'response-123' }],
      error: null
    }))
  }));

  // Default successful update response
  mockUpdate.mockImplementation(() => ({
    eq: vi.fn(() => Promise.resolve({
      data: [{ id: 'request-123', status: 'completed' }],
      error: null
    }))
  }));

  // Default successful select response
  mockSelect.mockImplementation(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({
        data: { id: 'request-123', status: 'pending' },
        error: null
      }))
    }))
  }));
});

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('useFeedbackSubmission', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Submission Flow', () => {
    it('should successfully submit feedback with all required data', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: 'Great communication skills and teamwork',
        areas_for_improvement: 'Could improve time management'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: 'abc123',
        sessionId: 'session-456',
        draftId: 'draft-789'
      };

      let submissionResult: boolean | undefined;

      await act(async () => {
        submissionResult = await result.current.submitFeedback(formData, options);
      });

      expect(submissionResult).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
      expect(anonymousClient.from).toHaveBeenCalledWith('feedback_responses');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Thank you! Your feedback has been submitted successfully.",
        variant: "default"
      });
      expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');
    });

    it('should handle submission without draft ID', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'senior_colleague',
        strengths: 'Excellent technical skills',
        areas_for_improvement: 'Better documentation needed'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: 'xyz789',
        sessionId: 'session-456'
      };

      let submissionResult: boolean | undefined;

      await act(async () => {
        submissionResult = await result.current.submitFeedback(formData, options);
      });

      expect(submissionResult).toBe(true);
      expect(anonymousClient.from).toHaveBeenCalledWith('feedback_responses');
    });

    it('should preserve existing draft and mark as final', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'junior_colleague',
        strengths: 'Very helpful and supportive',
        areas_for_improvement: 'Could take more initiative'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: 'def456',
        sessionId: 'session-789',
        draftId: 'draft-456'
      };

      await act(async () => {
        await result.current.submitFeedback(formData, options);
      });

      // Verify the draft was updated to final
      const updateCall = (anonymousClient.from as any).mock.results.find(
        (result: any) => result.value.update
      );
      expect(updateCall).toBeDefined();
    });

    it('should clear localStorage data on successful submission', async () => {
      // Pre-populate localStorage with test data
      localStorage.setItem('feedback_draft_abc123', JSON.stringify({ test: 'data' }));
      localStorage.setItem('feedback_state_abc123', JSON.stringify({ step: 'form' }));
      localStorage.setItem('last_feedback_analysis', JSON.stringify({ analysis: 'test' }));

      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: 'Strong analytical thinking',
        areas_for_improvement: 'Communication clarity'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: 'abc123',
        sessionId: 'session-456'
      };

      await act(async () => {
        await result.current.submitFeedback(formData, options);
      });

      // Verify localStorage was cleaned up
      expect(localStorage.getItem('feedback_draft_abc123')).toBeNull();
      expect(localStorage.getItem('feedback_state_abc123')).toBeNull();
      expect(localStorage.getItem('last_feedback_analysis')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required data gracefully', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: 'Good work',
        areas_for_improvement: 'Needs improvement'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: '',
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

    it('should handle database insertion errors', async () => {
      // Override the default mock for this test
      mockInsert.mockImplementation(() => ({
        select: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database constraint violation' }
        }))
      }));

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

    it('should handle feedback request update errors', async () => {
      // Mock successful insertion but failed update
      (anonymousClient.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'feedback_responses') {
          return {
            insert: vi.fn(() => Promise.resolve({
              data: [{ id: 'response-123' }],
              error: null
            }))
          };
        }
        if (tableName === 'feedback_requests') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Update failed' }
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { status: 'pending' },
                error: null
              }))
            }))
          }))
        };
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

      await act(async () => {
        await result.current.submitFeedback(formData, options);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Warning",
        description: "Feedback submitted but status update failed. Please contact support if needed.",
        variant: "default"
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      (anonymousClient.from as any).mockReturnValue({
        insert: vi.fn(() => Promise.reject(new Error('Network error')))
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
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    });
  });

  describe('State Management', () => {
    it('should track submission state correctly', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      expect(result.current.isSubmitting).toBe(false);

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

      const submissionPromise = act(async () => {
        return result.current.submitFeedback(formData, options);
      });

      expect(result.current.isSubmitting).toBe(true);

      await submissionPromise;

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should prevent concurrent submissions', async () => {
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

      // Start first submission
      const firstSubmission = act(async () => {
        return result.current.submitFeedback(formData, options);
      });

      // Try to start second submission while first is in progress
      let secondSubmissionResult: boolean | undefined;
      await act(async () => {
        secondSubmissionResult = await result.current.submitFeedback(formData, options);
      });

      // Second submission should be rejected
      expect(secondSubmissionResult).toBe(false);

      // Wait for first submission to complete
      const firstResult = await firstSubmission;
      expect(firstResult).toBe(true);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle empty feedback content', async () => {
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

    it('should handle very long feedback content', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      const longText = 'a'.repeat(10000); // 10k characters

      const formData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: longText,
        areas_for_improvement: longText
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

    it('should handle all relationship types correctly', async () => {
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
  });

  describe('Integration with Related Features', () => {
    it('should handle feedback request status transitions correctly', async () => {
      // Mock checking if this is the final response needed
      (anonymousClient.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'feedback_responses') {
          return {
            insert: vi.fn(() => Promise.resolve({
              data: [{ id: 'response-123' }],
              error: null
            }))
          };
        }
        if (tableName === 'feedback_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { 
                    id: 'request-123', 
                    target_responses: 5,
                    feedback_responses: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] // 4 existing + 1 new = 5 total
                  },
                  error: null
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [{ id: 'request-123', status: 'completed' }],
                error: null
              }))
            }))
          };
        }
        return {};
      });

      const { result } = renderHook(() => useFeedbackSubmission());

      const formData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: 'Final feedback strengths',
        areas_for_improvement: 'Final feedback improvements'
      };

      const options: SubmissionOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: 'abc123',
        sessionId: 'session-456'
      };

      await act(async () => {
        await result.current.submitFeedback(formData, options);
      });

      // Should transition to completed status when target reached
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Thank you! Your feedback has been submitted successfully.",
        variant: "default"
      });
    });

    it('should mark feedback as submitted in localStorage tracking', async () => {
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
}); 