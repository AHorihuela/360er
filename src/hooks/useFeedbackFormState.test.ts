/// <reference types="vitest" />
import { renderHook, act } from '@testing-library/react';
import { useFeedbackFormState } from './useFeedbackFormState';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('useFeedbackFormState', () => {
  const mockProps = {
    uniqueLink: 'test-link',
    sessionId: 'test-session'
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('initializes with default values when no saved data exists', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    expect(result.current.formData).toEqual({
      relationship: 'equal_colleague',
      strengths: '',
      areas_for_improvement: ''
    });

    expect(result.current.formState).toEqual({
      step: 'editing',
      aiAnalysisAttempted: false
    });
  });

  test('restores saved form data from localStorage', () => {
    const savedData = {
      relationship: 'senior_colleague',
      strengths: 'test strengths',
      areas_for_improvement: 'test improvements'
    };

    localStorage.setItem(`feedback_draft_${mockProps.uniqueLink}`, JSON.stringify(savedData));

    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    expect(result.current.formData).toEqual(savedData);
  });

  test('updates form data and saves to localStorage', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.updateFormData({
        strengths: 'new strengths'
      });
    });

    expect(result.current.formData.strengths).toBe('new strengths');
    expect(JSON.parse(localStorage.getItem(`feedback_draft_${mockProps.uniqueLink}`) || '{}')).toHaveProperty('strengths', 'new strengths');
  });

  test('handles form state transitions correctly', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.moveToAiReview();
    });

    expect(result.current.formState.step).toBe('ai_review');
    expect(result.current.formState.aiAnalysisAttempted).toBe(true);

    act(() => {
      result.current.moveToEditing();
    });

    expect(result.current.formState.step).toBe('editing');
  });

  test('clears saved data on submission', () => {
    // Setup initial data
    localStorage.setItem(`feedback_draft_${mockProps.uniqueLink}`, JSON.stringify({ strengths: 'test' }));
    localStorage.setItem(`feedback_state_${mockProps.uniqueLink}`, JSON.stringify({ step: 'editing' }));
    localStorage.setItem('last_feedback_analysis', JSON.stringify({ data: 'test' }));

    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.clearSavedData();
    });

    expect(localStorage.getItem(`feedback_draft_${mockProps.uniqueLink}`)).toBeNull();
    expect(localStorage.getItem(`feedback_state_${mockProps.uniqueLink}`)).toBeNull();
    expect(localStorage.getItem('last_feedback_analysis')).toBeNull();
  });

  test('handles submission status correctly', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    expect(result.current.isSubmitted).toBe(false);

    act(() => {
      result.current.markAsSubmitted();
    });

    const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
    expect(submittedFeedbacks[mockProps.uniqueLink]).toBe(true);
  });

  test('handles submission failure correctly', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.startSubmission();
    });

    expect(result.current.formState.step).toBe('submitting');

    act(() => {
      result.current.handleSubmissionFailure();
    });

    expect(result.current.formState.step).toBe('ai_review');
  });
}); 