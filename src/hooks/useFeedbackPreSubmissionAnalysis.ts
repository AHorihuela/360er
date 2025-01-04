import { useState, useCallback } from 'react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

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
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { 
            role: "system", 
            content: `You are an expert in 360-degree performance reviews and feedback...`
          },
          { 
            role: "user", 
            content: `Please analyze this feedback. The reviewer's relationship to the employee is: ${feedbackData.relationship}.

Strengths:
${feedbackData.strengths}

Areas for Improvement:
${feedbackData.areas_for_improvement}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      // Step 2: Review content
      callbacks.onStepComplete();
      console.log('OpenAI Response:', completion.choices[0].message);
      
      // Step 3: Evaluate
      callbacks.onStepComplete();
      let analysis: AiFeedbackResponse;
      try {
        const parsedResponse = JSON.parse(completion.choices[0].message.content || '{}');
        
        // Step 4: Generate suggestions
        callbacks.onStepComplete();
        
        // Validate and normalize the response structure
        analysis = {
          overallQuality: parsedResponse.overallQuality === 'Moderate' ? 'good' : 
                         parsedResponse.overallQuality === 'Satisfactory' ? 'good' :
                         parsedResponse.overallQuality.toLowerCase() as 'excellent' | 'good' | 'needs_improvement',
          summary: typeof parsedResponse.summary === 'string' ? 
                  parsedResponse.summary : 
                  typeof parsedResponse.summary === 'object' ? 
                    Object.values(parsedResponse.summary).join(' ') : 
                    'Failed to parse summary',
          suggestions: Array.isArray(parsedResponse.suggestions) ? 
            parsedResponse.suggestions.map((s: any) => ({
              type: (s.type || 'enhancement').toLowerCase() as 'critical' | 'enhancement',
              category: (s.category || 'actionability').toLowerCase() as 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness',
              suggestion: s.suggestion || s.content || '',
              context: s.context || '',
              highlightStart: s.context || s.highlightStart || '',
              highlightEnd: s.context || s.highlightEnd || ''
            })) : []
        };
      } catch (parseError) {
        throw new Error('Failed to parse AI response');
      }

      // Step 5: Finalize
      callbacks.onStepComplete();
      
      // Save analysis with scoped key
      localStorage.setItem(`feedback_analysis_${feedbackRequestId}`, JSON.stringify(analysis));
      
      try {
        await supabase
          .from('feedback_analyses')
          .insert({
            strengths: feedbackData.strengths,
            areas_for_improvement: feedbackData.areas_for_improvement,
            analysis: analysis,
            model_version: 'gpt-4',
            prompt_version: '1.0'
          });
      } catch (error) {
        // Silently handle storage errors
        console.warn('Failed to store analysis in database:', error);
      }

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