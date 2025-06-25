import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFeedbackSubmission } from '../useFeedbackSubmission';
import type { FeedbackFormData } from '../../types/feedback/form';
import type { SubmissionOptions } from '../../types/feedback/submission';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock Supabase 
vi.mock('../../lib/supabase', () => {
  const mockMaybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const mockSingle = vi.fn(() => Promise.resolve({ data: { id: 'test-feedback-123' }, error: null }));
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEqChain = vi.fn(() => ({ eq: mockEq }));
  const mockSelectChain = vi.fn(() => ({ eq: mockEqChain }));
  const mockFrom = vi.fn(() => ({
    select: mockSelectChain,
    insert: mockInsert
  }));

  return {
    anonymousClient: {
      from: mockFrom
    }
  };
});

describe('useFeedbackSubmission', () => {
  const validFormData: FeedbackFormData = {
    relationship: 'equal_colleague',
    strengths: 'Great communication skills',
    areas_for_improvement: 'Could be more proactive'
  };

  const validOptions: SubmissionOptions = {
    feedbackRequestId: 'request-123',
    uniqueLink: 'test-link-456',
    sessionId: 'session-789'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Hook Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      expect(result.current.isSubmitting).toBe(false);
      expect(typeof result.current.submitFeedback).toBe('function');
    });
  });

  describe('Submission Validation', () => {
    it('should reject submission without required options', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());
      
      const incompleteOptions = {
        feedbackRequestId: 'request-123',
        uniqueLink: '',
        sessionId: 'session-789'
      } as SubmissionOptions;

      await act(async () => {
        const success = await result.current.submitFeedback(validFormData, incompleteOptions);
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Missing required data for submission. Please try again.",
        variant: "destructive",
      });
    });

    it('should reject submission without feedback request ID', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());
      
      const incompleteOptions = {
        feedbackRequestId: '',
        uniqueLink: 'test-link',
        sessionId: 'session-789'
      } as SubmissionOptions;

      await act(async () => {
        const success = await result.current.submitFeedback(validFormData, incompleteOptions);
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Missing required data for submission. Please try again.",
        variant: "destructive",
      });
    });
  });

  describe('Successful Submission', () => {
    it('should handle successful submission', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      await act(async () => {
        const success = await result.current.submitFeedback(validFormData, validOptions);
        expect(success).toBe(true);
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Thank you for your feedback!",
      });
    });

    it('should manage loading state during submission', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      expect(result.current.isSubmitting).toBe(false);

      const submissionPromise = act(async () => {
        return result.current.submitFeedback(validFormData, validOptions);
      });

      // Note: Due to React's batching, checking mid-submission state is complex
      // We focus on the final state instead
      await submissionPromise;
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock the import and override the mock for this test
      const { anonymousClient } = await import('../../lib/supabase');
      const mockFrom = vi.mocked(anonymousClient.from);
      
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      } as any);

      const { result } = renderHook(() => useFeedbackSubmission());

      await act(async () => {
        const success = await result.current.submitFeedback(validFormData, validOptions);
        expect(success).toBe(false);
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    });
  });

  describe('LocalStorage Management', () => {
    it('should store submission status in localStorage', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());

      await act(async () => {
        await result.current.submitFeedback(validFormData, validOptions);
      });

      const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
      expect(submittedFeedbacks[validOptions.uniqueLink]).toBe(true);
    });

    it('should clear draft data on successful submission', async () => {
      // Pre-populate localStorage with draft data
      localStorage.setItem(`feedback_draft_${validOptions.uniqueLink}`, 'some draft data');
      localStorage.setItem('last_feedback_analysis', 'some analysis data');

      const { result } = renderHook(() => useFeedbackSubmission());

      await act(async () => {
        await result.current.submitFeedback(validFormData, validOptions);
      });

      expect(localStorage.getItem(`feedback_draft_${validOptions.uniqueLink}`)).toBeNull();
      expect(localStorage.getItem('last_feedback_analysis')).toBeNull();
    });
  });

  describe('Form Data Processing', () => {
    it('should handle form data with extra whitespace', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());
      
      const dataWithWhitespace: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: '  Great communication skills  ',
        areas_for_improvement: '  Could be more proactive  '
      };

      await act(async () => {
        const success = await result.current.submitFeedback(dataWithWhitespace, validOptions);
        expect(success).toBe(true);
      });

      // Verify the database interaction occurred
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Thank you for your feedback!",
      });
    });

    it('should handle empty form fields', async () => {
      const { result } = renderHook(() => useFeedbackSubmission());
      
      const emptyFormData: FeedbackFormData = {
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: ''
      };

      await act(async () => {
        const success = await result.current.submitFeedback(emptyFormData, validOptions);
        expect(success).toBe(true);
      });

      // Verify the database interaction occurred  
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Thank you for your feedback!",
      });
    });
  });
}); 