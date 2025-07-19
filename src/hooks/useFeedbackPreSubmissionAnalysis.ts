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
      const requestBody = {
        relationship: feedbackData.relationship,
        strengths: feedbackData.strengths,
        areas_for_improvement: feedbackData.areas_for_improvement
      };
      
      console.log('Sending feedback analysis request:', requestBody);
      
      const response = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status, response.statusText);
      // Note: headers.entries() may not be available in test environment
      if (response.headers && response.headers.entries) {
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If error response is not valid JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Step 2: Review content
      callbacks.onStepComplete();
      
      let analysis: AiFeedbackResponse;
      try {
        analysis = await response.json();
      } catch (jsonError) {
        throw new Error('Invalid response format from analysis service');
      }
      
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