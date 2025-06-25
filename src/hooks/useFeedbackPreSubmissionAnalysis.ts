import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface FeedbackData {
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string;
  areas_for_improvement: string;
}

interface AiFeedbackSuggestion {
  type: 'critical' | 'enhancement';
  category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
  suggestion: string;
  context?: string;
  highlightStart?: string;
  highlightEnd?: string;
}

interface AiFeedbackResponse {
  overallQuality: 'excellent' | 'good' | 'needs_improvement';
  suggestions: AiFeedbackSuggestion[];
  summary: string;
}

interface AnalysisCallbacks {
  onStepComplete: () => void;
  onError: () => void;
  onComplete: () => void;
}

interface UseFeedbackPreSubmissionAnalysisProps {
  feedbackRequestId: string;
}

export function useFeedbackPreSubmissionAnalysis({ feedbackRequestId }: UseFeedbackPreSubmissionAnalysisProps) {
  const [aiResponse, setAiResponse] = useState<AiFeedbackResponse | null>(() => {
    try {
      const savedAnalysis = localStorage.getItem(`feedback_analysis_${feedbackRequestId}`);
      return savedAnalysis ? JSON.parse(savedAnalysis) : null;
    } catch (error) {
      console.error('Failed to restore saved analysis:', error);
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const analyzeFeedback = useCallback(async (
    feedbackData: FeedbackData,
    callbacks: AnalysisCallbacks
  ) => {
    try {
      console.log('Starting feedback pre-submission analysis...');
      setError(null);
      
      // Step 1: Initialize
      callbacks.onStepComplete();
      
      // Make server-side API call instead of direct OpenAI call
      const response = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relationship: feedbackData.relationship,
          strengths: feedbackData.strengths,
          areas_for_improvement: feedbackData.areas_for_improvement
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Step 2: Review content
      callbacks.onStepComplete();
      
      const analysis: AiFeedbackResponse = await response.json();
      
      // Step 3: Evaluate
      callbacks.onStepComplete();

      // Step 5: Finalize
      callbacks.onStepComplete();
      
      // Save analysis with scoped key
      localStorage.setItem(`feedback_analysis_${feedbackRequestId}`, JSON.stringify(analysis));

      setAiResponse(analysis);
      callbacks.onComplete();
      return analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze feedback';
      setError(errorMessage);
      callbacks.onError();
      throw error;
    }
  }, [feedbackRequestId]);

  const resetAnalysis = useCallback(() => {
    setAiResponse(null);
    setError(null);
    localStorage.removeItem(`feedback_analysis_${feedbackRequestId}`);
  }, [feedbackRequestId]);

  return {
    aiResponse,
    error,
    analyzeFeedback,
    resetAnalysis
  };
} 