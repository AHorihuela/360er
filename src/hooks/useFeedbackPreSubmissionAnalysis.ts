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
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `You are an expert in 360-degree performance reviews and feedback. You understand workplace dynamics, professional boundaries, and the different perspectives that come from various organizational relationships.

Analyze the feedback and return a JSON object with the following structure:
{
  "overallQuality": "excellent" | "good" | "needs_improvement",
  "summary": "A single paragraph summarizing the overall feedback quality",
  "suggestions": [
    {
      "type": "critical" | "enhancement",
      "category": "clarity" | "specificity" | "actionability" | "tone" | "completeness",
      "suggestion": "The specific suggestion text",
      "context": "The exact quote from the feedback that needs improvement",
      "highlightStart": "The first few words of the section to highlight",
      "highlightEnd": "The last few words of the section to highlight"
    }
  ]
}

When analyzing feedback, consider:
1. The reviewer's relationship to the employee (senior, peer, or junior) affects:
   - The expected level of detail in improvement suggestions
   - The scope of feedback they can reasonably provide
   - The appropriate tone and perspective
2. Focus on professional impact and work performance observations
3. Understand that specific improvement suggestions are optional and depend on:
   - The reviewer's role relative to the reviewee
   - The reviewer's area of expertise
   - The nature of their working relationship
4. Maintain objectivity and professionalism in all suggestions
5. Ensure feedback addresses observable behaviors and outcomes

CRITICAL REQUIREMENTS:
- The 'Areas for Improvement' section MUST contain different content from the 'Strengths' section
- If the sections are identical or very similar, this should be treated as a critical issue and result in a 'needs_improvement' rating
- Duplicate content between sections should be explicitly called out in the suggestions`
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
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      // Step 2: Review content
      callbacks.onStepComplete();
      console.log('OpenAI Response:', completion.choices[0].message);
      
      // Step 3: Evaluate
      callbacks.onStepComplete();
      let analysis: AiFeedbackResponse;
      try {
        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error('Invalid response format from OpenAI');
        }
        analysis = JSON.parse(content) as AiFeedbackResponse;
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
            model_version: 'gpt-4o',
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