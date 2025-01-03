import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, Loader2 } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { AnalysisSteps } from './AnalysisSteps';
import { useAnalysisSteps } from '@/hooks/useAnalysisSteps';
import { useSuggestionFiltering } from '@/hooks/useSuggestionFiltering';

interface FeedbackFormData {
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string;
  areas_for_improvement: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

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

interface Props {
  feedbackData: {
    strengths: string;
    areas_for_improvement: string;
    relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  };
  onSubmit: (e?: React.FormEvent) => void | Promise<void>;
  onRevise: () => void;
  isLoading: boolean;
  onFeedbackChange?: (field: 'strengths' | 'areas_for_improvement', value: string) => void;
}

const categoryLabels = {
  clarity: 'Clarity',
  specificity: 'Specificity',
  actionability: 'Actionability',
  tone: 'Tone',
  completeness: 'Completeness'
};

// Add quality colors back with proper usage
const qualityColors = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  needs_improvement: 'bg-yellow-100 text-yellow-800'
} as const;

interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

export function AiFeedbackReview({ 
  feedbackData, 
  onSubmit, 
  onRevise, 
  isLoading,
  onFeedbackChange 
}: Props) {
  const [aiResponse, setAiResponse] = useState<AiFeedbackResponse | null>(() => {
    try {
      const savedAnalysis = localStorage.getItem('last_feedback_analysis');
      return savedAnalysis ? JSON.parse(savedAnalysis) : null;
    } catch (error) {
      console.error('Failed to restore saved analysis:', error);
      return null;
    }
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { 
    steps, 
    progressToNextStep,
    completeAllSteps, 
    markStepsAsError, 
    resetSteps 
  } = useAnalysisSteps(isAnalyzing);

  // Only start analysis if we don't have a saved response
  useEffect(() => {
    const shouldStartAnalysis = !aiResponse && 
                              !localStorage.getItem('last_feedback_analysis') && 
                              !isAnalyzing;
    
    if (shouldStartAnalysis) {
      console.log('Starting initial analysis');
      setIsAnalyzing(true);
    }
  }, []); // Only run on mount

  // Start analysis when isAnalyzing is set to true
  useEffect(() => {
    if (isAnalyzing) {
      void analyzeFeedback();
    }
  }, [isAnalyzing]);

  // Update steps when AI response changes
  useEffect(() => {
    if (aiResponse) {
      console.log('AI response received, marking all steps as completed');
      completeAllSteps();
      setIsAnalyzing(false);
    }
  }, [aiResponse, completeAllSteps]);

  // Debounce feedback changes
  const debouncedFeedbackChange = useCallback(
    debounce(async (field: 'strengths' | 'areas_for_improvement', value: string) => {
      console.log('Saving feedback change:', { field, value });
      if (onFeedbackChange) {
        await onFeedbackChange(field, value);
      }
    }, 1000), // Increased debounce time to reduce database writes
    [onFeedbackChange]
  );

  // Handle feedback changes
  const handleFeedbackChange = useCallback((field: 'strengths' | 'areas_for_improvement', value: string) => {
    console.log('Handling feedback change:', { field, value });
    debouncedFeedbackChange(field, value);
  }, [debouncedFeedbackChange]);

  const analyzeFeedback = async () => {
    try {
      console.log('Starting feedback analysis...');
      
      // Step 1: Initialize
      progressToNextStep();
      
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
      progressToNextStep();
      console.log('OpenAI Response:', completion.choices[0].message);
      
      // Step 3: Evaluate
      progressToNextStep();
      let analysis: AiFeedbackResponse;
      try {
        const parsedResponse = JSON.parse(completion.choices[0].message.content || '{}');
        
        // Step 4: Generate suggestions
        progressToNextStep();
        
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
      progressToNextStep();
      
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
      }

      setAiResponse(analysis);
      completeAllSteps();
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze feedback');
      markStepsAsError();
    }
  };

  const strengthsHighlights = useSuggestionFiltering(
    aiResponse?.suggestions || [],
    feedbackData.strengths
  );

  const improvementsHighlights = useSuggestionFiltering(
    aiResponse?.suggestions || [],
    feedbackData.areas_for_improvement
  );

  if (isLoading || !aiResponse) {
    return <AnalysisSteps steps={steps} error={analysisError} />;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">AI Feedback Review</CardTitle>
          {aiResponse && (
            <Badge 
              className={qualityColors[aiResponse.overallQuality]}
              variant={aiResponse.overallQuality === 'needs_improvement' ? 'destructive' : 
                      aiResponse.overallQuality === 'good' ? 'secondary' : 
                      'default'}>
              {aiResponse.overallQuality.toUpperCase().replace('_', ' ')}
            </Badge>
          )}
        </div>
        {aiResponse && (
          <CardDescription className="text-sm sm:text-base text-gray-700 leading-relaxed mt-2">
            {aiResponse.summary}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {analysisError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Error</Badge>
              <span className="text-xs sm:text-sm font-medium text-red-800">Analysis Failed</span>
            </div>
            <p className="text-xs sm:text-sm text-red-700">
              {analysisError}
            </p>
            <p className="text-xs sm:text-sm text-red-600">
              You can still submit your feedback, or try analyzing again.
            </p>
          </div>
        )}

        {aiResponse && (
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="text-xs sm:text-sm">Edit & Preview</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs sm:text-sm">
                AI Suggestions
                {aiResponse && aiResponse.suggestions.length > 0 && (
                  <Badge 
                    variant="outline" 
                    className="ml-2 text-[11px] h-5 min-w-5 px-1.5 bg-black text-white rounded-full">
                    {aiResponse.suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm sm:text-base font-medium mb-2">Strengths</h4>
                  <RichTextEditor
                    value={feedbackData.strengths}
                    onChange={(value) => handleFeedbackChange('strengths', value)}
                    highlights={strengthsHighlights}
                  />
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-medium mb-2">Areas for Improvement</h4>
                  <RichTextEditor
                    value={feedbackData.areas_for_improvement}
                    onChange={(value) => handleFeedbackChange('areas_for_improvement', value)}
                    highlights={improvementsHighlights}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <div className="space-y-4 sm:space-y-6">
                {/* Critical Suggestions */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-sm sm:text-base font-medium">Critical Improvements Needed</h4>
                  {aiResponse.suggestions
                    .filter(s => s.type === 'critical')
                    .map((suggestion, index) => (
                      <div key={index} className="rounded-lg border bg-red-50 p-3 sm:p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {categoryLabels[suggestion.category]}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm">{suggestion.suggestion}</p>
                        {suggestion.context && (
                          <p className="text-xs sm:text-sm text-muted-foreground italic">
                            Context: "{suggestion.context}"
                          </p>
                        )}
                      </div>
                    ))}
                </div>

                {/* Enhancement Suggestions */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-sm sm:text-base font-medium">Suggested Enhancements</h4>
                  {aiResponse.suggestions
                    .filter(s => s.type === 'enhancement')
                    .map((suggestion, index) => (
                      <div key={index} className="rounded-lg border bg-blue-50 p-3 sm:p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[suggestion.category]}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm">{suggestion.suggestion}</p>
                        {suggestion.context && (
                          <p className="text-xs sm:text-sm text-muted-foreground italic">
                            Context: "{suggestion.context}"
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button 
          variant="outline" 
          onClick={() => {
            setAiResponse(null);
            setAnalysisError(null);
            resetSteps();
            void analyzeFeedback();
          }}
          disabled={isLoading}
          className="w-full sm:w-auto">
          Analyze Again
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isLoading || !aiResponse}
          className="w-full sm:w-auto">
          Submit Feedback
        </Button>
      </CardFooter>
    </Card>
  );
} 