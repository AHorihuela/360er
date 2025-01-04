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

export function useFeedbackPreSubmissionAnalysis() {
  const [aiResponse, setAiResponse] = useState<AiFeedbackResponse | null>(() => {
    try {
      const savedAnalysis = localStorage.getItem('last_feedback_analysis');
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
            content: `You are an expert in 360-degree performance reviews and feedback. You understand workplace dynamics, professional boundaries, and the different perspectives that come from various organizational relationships.

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
6. Align feedback with our company values, but don't mention the company values in the suggestions:
   - Operational Excellence and Innovation
   - Taking Initiative and Calculated Risks
   - Urgency and Efficiency in Execution
   - Quality and Simplicity in Delivery
   - Team Energy and Collaboration
   - Continuous Improvement Mindset

CRITICAL REQUIREMENTS:
- The 'Areas for Improvement' section MUST contain different content from the 'Strengths' section
- If the sections are identical or very similar, this should be treated as a critical issue and result in a 'needs_improvement' rating
- Duplicate content between sections should be explicitly called out in the suggestions

Return a JSON response with this structure:
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

Guidelines:
- Focus on the quality of observations and impact descriptions rather than expecting specific solutions
- Recognize that improvement suggestions are more appropriate from senior reviewers, however if a peer or junior reviewer has a good suggestion, don't reject it
- For peer/junior reviews, focus on clarity of impact description rather than prescriptive solutions
- Frame feedback in terms of observed business impact and team dynamics
- Consider the professional relationship context in all suggestions
- Encourage specific examples of behaviors and their impact
- Respect the boundaries of the reviewer-reviewee relationship`
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
      
      // Save analysis
      localStorage.setItem('last_feedback_analysis', JSON.stringify(analysis));
      
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
  }, []);

  const resetAnalysis = useCallback(() => {
    setAiResponse(null);
    setError(null);
    localStorage.removeItem('last_feedback_analysis');
  }, []);

  return {
    aiResponse,
    error,
    analyzeFeedback,
    resetAnalysis
  };
} 