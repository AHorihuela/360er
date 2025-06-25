import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFeedbackFormState } from '../useFeedbackFormState';
import { FeedbackFormData, FeedbackFormState } from '@/types/feedback/form';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('useFeedbackFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State Management', () => {
    it('should initialize with default form data when uniqueLink is provided', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      expect(result.current.formData).toEqual({
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: ''
      });

      expect(result.current.formState).toEqual({
        step: 'form',
        aiAnalysisAttempted: false,
        draftId: undefined
      });
    });

    it('should restore form data from localStorage when available', () => {
      const savedData: FeedbackFormData = {
        relationship: 'senior_colleague',
        strengths: 'Excellent leadership skills',
        areas_for_improvement: 'Could improve delegation'
      };

      localStorage.setItem('feedback_draft_test-123', JSON.stringify(savedData));

      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      expect(result.current.formData).toEqual(savedData);
    });

    it('should restore form state from localStorage when available', () => {
      const savedState: FeedbackFormState = {
        step: 'ai_review',
        aiAnalysisAttempted: true,
        draftId: 'draft-456'
      };

      localStorage.setItem('feedback_state_test-123', JSON.stringify(savedState));

      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      expect(result.current.formState).toEqual(savedState);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('feedback_draft_test-123', 'invalid-json');
      localStorage.setItem('feedback_state_test-123', 'invalid-json');

      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Should fall back to defaults
      expect(result.current.formData.relationship).toBe('equal_colleague');
      expect(result.current.formState.step).toBe('form');
    });

    it('should handle missing uniqueLink gracefully', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: '' })
      );

      expect(result.current.formData).toEqual({
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: ''
      });
    });
  });

  describe('Form Data Management', () => {
    it('should update form data and persist to localStorage', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      act(() => {
        result.current.updateFormData({
          strengths: 'Great communication skills'
        });
      });

      expect(result.current.formData.strengths).toBe('Great communication skills');
      expect(result.current.formData.relationship).toBe('equal_colleague'); // unchanged

      // Check localStorage
      const savedData = JSON.parse(localStorage.getItem('feedback_draft_test-123') || '{}');
      expect(savedData.strengths).toBe('Great communication skills');
    });

    it('should handle partial form data updates', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      act(() => {
        result.current.updateFormData({
          relationship: 'senior_colleague'
        });
      });

      act(() => {
        result.current.updateFormData({
          areas_for_improvement: 'Needs better time management'
        });
      });

      expect(result.current.formData).toEqual({
        relationship: 'senior_colleague',
        strengths: '',
        areas_for_improvement: 'Needs better time management'
      });
    });

    it('should not persist to localStorage when uniqueLink is empty', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: '' })
      );

      act(() => {
        result.current.updateFormData({
          strengths: 'Should not be saved'
        });
      });

      expect(localStorage.getItem('feedback_draft_')).toBeNull();
    });
  });

  describe('Form State Management', () => {
    it('should update form state and persist to localStorage', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      act(() => {
        result.current.updateFormState({
          step: 'ai_review',
          aiAnalysisAttempted: true,
          draftId: 'draft-789'
        });
      });

      expect(result.current.formState).toEqual({
        step: 'ai_review',
        aiAnalysisAttempted: true,
        draftId: 'draft-789'
      });

      // Check localStorage
      const savedState = JSON.parse(localStorage.getItem('feedback_state_test-123') || '{}');
      expect(savedState).toEqual({
        step: 'ai_review',
        aiAnalysisAttempted: true,
        draftId: 'draft-789'
      });
    });

    it('should handle step transitions', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Move to AI review
      act(() => {
        result.current.moveToAiReview();
      });

      expect(result.current.formState.step).toBe('ai_review');
      expect(result.current.formState.aiAnalysisAttempted).toBe(true);

      // Move back to editing
      act(() => {
        result.current.moveToEditing();
      });

      expect(result.current.formState.step).toBe('form');
      expect(result.current.formState.aiAnalysisAttempted).toBe(true); // preserved
    });

    it('should handle submission state transitions', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Start submission
      act(() => {
        result.current.startSubmission();
      });

      expect(result.current.formState.step).toBe('submitting');

      // Handle failure
      act(() => {
        result.current.handleSubmissionFailure();
      });

      expect(result.current.formState.step).toBe('ai_review');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    });
  });

  describe('Submission Tracking', () => {
    it('should check for existing submissions', () => {
      // Pre-populate with a submission
      localStorage.setItem('submittedFeedbacks', JSON.stringify({
        'test-123': true,
        'other-link': false
      }));

      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      expect(result.current.isSubmitted).toBe(true);
      expect(result.current.checkExistingSubmission()).toBe(true);
    });

    it('should return false for non-existent submissions', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'new-link' })
      );

      expect(result.current.isSubmitted).toBe(false);
      expect(result.current.checkExistingSubmission()).toBe(false);
    });

    it('should mark feedback as submitted and navigate', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Add some data first
      act(() => {
        result.current.updateFormData({
          strengths: 'Good work'
        });
      });

      act(() => {
        result.current.markAsSubmitted();
      });

      // Check submission tracking
      const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
      expect(submittedFeedbacks['test-123']).toBe(true);

      // Check navigation
      expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');

      // Check cleanup
      expect(localStorage.getItem('feedback_draft_test-123')).toBeNull();
      expect(localStorage.getItem('feedback_state_test-123')).toBeNull();
    });
  });

  describe('Data Cleanup', () => {
    it('should clear all saved data for the unique link', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Add some data
      localStorage.setItem('feedback_draft_test-123', JSON.stringify({ test: 'data' }));
      localStorage.setItem('feedback_state_test-123', JSON.stringify({ step: 'form' }));
      localStorage.setItem('last_feedback_analysis', JSON.stringify({ analysis: 'data' }));

      act(() => {
        result.current.clearSavedData();
      });

      expect(localStorage.getItem('feedback_draft_test-123')).toBeNull();
      expect(localStorage.getItem('feedback_state_test-123')).toBeNull();
      expect(localStorage.getItem('last_feedback_analysis')).toBeNull();
    });

    it('should not affect data for other unique links', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Add data for multiple links
      localStorage.setItem('feedback_draft_test-123', JSON.stringify({ test: 'data' }));
      localStorage.setItem('feedback_draft_other-456', JSON.stringify({ other: 'data' }));

      act(() => {
        result.current.clearSavedData();
      });

      expect(localStorage.getItem('feedback_draft_test-123')).toBeNull();
      expect(localStorage.getItem('feedback_draft_other-456')).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not crash when localStorage fails
      act(() => {
        result.current.updateFormData({
          strengths: 'This should not crash the app'
        });
      });

      expect(result.current.formData.strengths).toBe('This should not crash the app');

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should handle very long form data', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      const longText = 'a'.repeat(10000); // 10k characters

      act(() => {
        result.current.updateFormData({
          strengths: longText,
          areas_for_improvement: longText
        });
      });

      expect(result.current.formData.strengths).toBe(longText);
      expect(result.current.formData.areas_for_improvement).toBe(longText);
    });

    it('should handle special characters in form data', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      const specialText = 'Excellent work with émojis 🎉 and "quotes" & symbols! <script>alert("test")</script>';

      act(() => {
        result.current.updateFormData({
          strengths: specialText
        });
      });

      expect(result.current.formData.strengths).toBe(specialText);

      // Should persist correctly
      const savedData = JSON.parse(localStorage.getItem('feedback_draft_test-123') || '{}');
      expect(savedData.strengths).toBe(specialText);
    });

    it('should handle rapid state updates', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Simulate rapid typing
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateFormData({
            strengths: `Character ${i}`
          });
        }
      });

      expect(result.current.formData.strengths).toBe('Character 99');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete feedback submission workflow', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Step 1: Fill out form
      act(() => {
        result.current.updateFormData({
          relationship: 'senior_colleague',
          strengths: 'Excellent technical leadership',
          areas_for_improvement: 'Could improve documentation practices'
        });
      });

      // Step 2: Move to AI review
      act(() => {
        result.current.moveToAiReview();
      });

      expect(result.current.formState.step).toBe('ai_review');

      // Step 3: Start submission
      act(() => {
        result.current.startSubmission();
      });

      expect(result.current.formState.step).toBe('submitting');

      // Step 4: Complete submission
      act(() => {
        result.current.markAsSubmitted();
      });

      expect(result.current.isSubmitted).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/feedback/thank-you');
    });

    it('should handle failed submission and recovery', () => {
      const { result } = renderHook(() => 
        useFeedbackFormState({ uniqueLink: 'test-123' })
      );

      // Fill out form and move to AI review
      act(() => {
        result.current.updateFormData({
          strengths: 'Good work'
        });
        result.current.moveToAiReview();
        result.current.startSubmission();
      });

      // Simulate failure
      act(() => {
        result.current.handleSubmissionFailure();
      });

      // Should return to AI review state
      expect(result.current.formState.step).toBe('ai_review');
      expect(result.current.formData.strengths).toBe('Good work'); // Data preserved
    });
  });
}); 