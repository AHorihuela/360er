import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface FeedbackFormData {
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string;
  areas_for_improvement: string;
}

interface FeedbackFormState {
  step: 'editing' | 'ai_review' | 'submitting';
  aiAnalysisAttempted: boolean;
  draftId?: string;
}

interface UseFeedbackFormStateProps {
  uniqueLink: string;
  sessionId: string;
}

export function useFeedbackFormState({ uniqueLink, sessionId }: UseFeedbackFormStateProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form data state
  const [formData, setFormData] = useState<FeedbackFormData>(() => {
    if (!uniqueLink) return {
      relationship: 'equal_colleague',
      strengths: '',
      areas_for_improvement: ''
    };

    try {
      const savedData = localStorage.getItem(`feedback_draft_${uniqueLink}`);
      return savedData ? JSON.parse(savedData) : {
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: ''
      };
    } catch (e) {
      console.error('Error parsing saved form data:', e);
      return {
        relationship: 'equal_colleague',
        strengths: '',
        areas_for_improvement: ''
      };
    }
  });

  // Form state management
  const [formState, setFormState] = useState<FeedbackFormState>(() => {
    if (!uniqueLink) return {
      step: 'editing',
      aiAnalysisAttempted: false
    };

    try {
      const savedState = localStorage.getItem(`feedback_state_${uniqueLink}`);
      return savedState ? JSON.parse(savedState) : {
        step: 'editing',
        aiAnalysisAttempted: false
      };
    } catch (e) {
      console.error('Error parsing saved form state:', e);
      return {
        step: 'editing',
        aiAnalysisAttempted: false
      };
    }
  });

  // Check for existing submissions
  const checkExistingSubmission = useCallback(() => {
    if (!uniqueLink) return false;
    const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
    return submittedFeedbacks[uniqueLink] || false;
  }, [uniqueLink]);

  // Save form data to localStorage
  useEffect(() => {
    if (uniqueLink && (formData.strengths || formData.areas_for_improvement)) {
      localStorage.setItem(`feedback_draft_${uniqueLink}`, JSON.stringify(formData));
    }
  }, [formData, uniqueLink]);

  // Save form state to localStorage
  useEffect(() => {
    if (uniqueLink) {
      localStorage.setItem(`feedback_state_${uniqueLink}`, JSON.stringify(formState));
    }
  }, [formState, uniqueLink]);

  // Clear all saved data
  const clearSavedData = useCallback(() => {
    if (uniqueLink) {
      localStorage.removeItem(`feedback_draft_${uniqueLink}`);
      localStorage.removeItem(`feedback_state_${uniqueLink}`);
      localStorage.removeItem('last_feedback_analysis');
    }
  }, [uniqueLink]);

  // Mark feedback as submitted
  const markAsSubmitted = useCallback(() => {
    if (uniqueLink) {
      const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
      submittedFeedbacks[uniqueLink] = true;
      localStorage.setItem('submittedFeedbacks', JSON.stringify(submittedFeedbacks));
      clearSavedData();
      navigate('/feedback/thank-you');
    }
  }, [uniqueLink, clearSavedData, navigate]);

  // Update form data
  const updateFormData = useCallback((newData: Partial<FeedbackFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  // Update form state
  const updateFormState = useCallback((newState: Partial<FeedbackFormState>) => {
    setFormState(prev => ({ ...prev, ...newState }));
  }, []);

  // Move to AI review step
  const moveToAiReview = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      step: 'ai_review',
      aiAnalysisAttempted: true
    }));
  }, []);

  // Move back to editing step
  const moveToEditing = useCallback(() => {
    setFormState(prev => ({ ...prev, step: 'editing' }));
  }, []);

  // Start submission process
  const startSubmission = useCallback(() => {
    setFormState(prev => ({ ...prev, step: 'submitting' }));
  }, []);

  // Handle submission failure
  const handleSubmissionFailure = useCallback(() => {
    setFormState(prev => ({ ...prev, step: 'ai_review' }));
    toast({
      title: "Error",
      description: "Failed to submit feedback. Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  return {
    formData,
    formState,
    updateFormData,
    updateFormState,
    clearSavedData,
    markAsSubmitted,
    moveToAiReview,
    moveToEditing,
    startSubmission,
    handleSubmissionFailure,
    checkExistingSubmission,
    isSubmitted: checkExistingSubmission()
  };
} 