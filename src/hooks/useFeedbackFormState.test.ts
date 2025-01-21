/// <reference types="vitest" />
import { renderHook, act } from '@testing-library/react';
import { useFeedbackFormState } from './useFeedbackFormState';
import { describe, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockProps = {
  uniqueLink: 'test-link'
};

describe('useFeedbackFormState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with default values when no saved data exists', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    expect(result.current.formState).toEqual({
      step: 'form',
      aiAnalysisAttempted: false,
      draftId: undefined
    });
  });

  it('restores saved form data from localStorage', () => {
    const savedState = {
      step: 'form',
      aiAnalysisAttempted: true,
      draftId: 'draft-1'
    };
    localStorage.setItem(`feedback_state_${mockProps.uniqueLink}`, JSON.stringify(savedState));

    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    expect(result.current.formState).toEqual(savedState);
  });

  it('updates form state and saves to localStorage', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.updateFormState({
        step: 'ai_review',
        aiAnalysisAttempted: true,
        draftId: 'draft-1'
      });
    });

    const savedState = JSON.parse(localStorage.getItem(`feedback_state_${mockProps.uniqueLink}`) || '{}');
    expect(savedState).toEqual({
      step: 'ai_review',
      aiAnalysisAttempted: true,
      draftId: 'draft-1'
    });
  });

  it('handles form state transitions correctly', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.moveToAiReview();
    });

    expect(result.current.formState.step).toBe('ai_review');
    expect(result.current.formState.aiAnalysisAttempted).toBe(true);

    act(() => {
      result.current.moveToEditing();
    });

    expect(result.current.formState.step).toBe('form');
  });

  it('clears saved data on submission', () => {
    const savedState = {
      step: 'form',
      aiAnalysisAttempted: true,
      draftId: 'draft-1'
    };
    localStorage.setItem(`feedback_state_${mockProps.uniqueLink}`, JSON.stringify(savedState));

    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.clearSavedData();
    });

    expect(localStorage.getItem(`feedback_state_${mockProps.uniqueLink}`)).toBeNull();
    expect(localStorage.getItem(`feedback_draft_${mockProps.uniqueLink}`)).toBeNull();
    expect(localStorage.getItem('last_feedback_analysis')).toBeNull();
  });

  it('handles submission process correctly', () => {
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

  it('marks feedback as submitted', () => {
    const { result } = renderHook(() => useFeedbackFormState(mockProps));

    act(() => {
      result.current.markAsSubmitted();
    });

    const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
    expect(submittedFeedbacks[mockProps.uniqueLink]).toBe(true);
  });
}); 