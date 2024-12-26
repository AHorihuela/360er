import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Brain } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface AiFeedbackSuggestion {
  type: 'critical' | 'enhancement';
  category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
  suggestion: string;
  context?: string;
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
  };
  onSubmit: () => void;
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

const qualityColors = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  needs_improvement: 'bg-yellow-100 text-yellow-800'
};

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
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: 'init', label: 'Initializing analysis...', status: 'pending' },
    { id: 'review', label: 'Reviewing feedback content...', status: 'pending' },
    { id: 'evaluate', label: 'Evaluating quality and actionability...', status: 'pending' },
    { id: 'suggest', label: 'Generating improvement suggestions...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing analysis...', status: 'pending' }
  ]);

  useEffect(() => {
    let stepInterval: NodeJS.Timeout;
    let currentStepIndex = 0;

    // Only start analysis if we don't have a saved response
    if (!aiResponse) {
      stepInterval = setInterval(() => {
        if (currentStepIndex < steps.length) {
          setSteps(prevSteps => prevSteps.map((step, index) => ({
            ...step,
            status: index === currentStepIndex ? 'in_progress' 
                   : index < currentStepIndex ? 'completed' 
                   : 'pending'
          })));
          currentStepIndex++;
        } else {
          clearInterval(stepInterval);
        }
      }, 1500);

      // Start the analysis
      void analyzeFeedback();
    } else {
      // If we have a saved response, mark all steps as completed
      setSteps(prevSteps => prevSteps.map(step => ({
        ...step,
        status: 'completed'
      })));
    }

    return () => {
      if (stepInterval) {
        clearInterval(stepInterval);
      }
    };
  }, [aiResponse, steps.length]);

  const analyzeFeedback = async () => {
    try {
      console.log('Starting feedback analysis...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { 
            role: "system", 
            content: `You are an expert in performance reviews and feedback. Analyze the provided feedback and return a JSON response with the following structure:
{
  "overallQuality": "excellent" | "good" | "needs_improvement",
  "summary": "A single paragraph summarizing the overall feedback quality",
  "suggestions": [
    {
      "type": "critical" | "enhancement",
      "category": "clarity" | "specificity" | "actionability" | "tone" | "completeness",
      "suggestion": "The specific suggestion text",
      "context": "Optional context from the feedback"
    }
  ]
}

Focus on:
1. Clarity: Is the feedback clear and easy to understand?
2. Specificity: Does it include specific examples and behaviors?
3. Actionability: Are there concrete suggestions for improvement?
4. Tone: Is the feedback constructive and professional?
5. Completeness: Are all aspects adequately addressed?`
          },
          { 
            role: "user", 
            content: `Please analyze this feedback and return a JSON response:

Strengths:
${feedbackData.strengths}

Areas for Improvement:
${feedbackData.areas_for_improvement}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      console.log('OpenAI Response:', completion.choices[0].message);
      
      let analysis: AiFeedbackResponse;
      try {
        const parsedResponse = JSON.parse(completion.choices[0].message.content || '{}');
        console.log('Raw parsed response:', parsedResponse);
        
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
            parsedResponse.suggestions.map((s: { 
              type?: string;
              category?: string;
              suggestion?: string;
              content?: string;
              context?: string;
            }) => ({
              type: (s.type || 'enhancement').toLowerCase() as 'critical' | 'enhancement',
              category: (s.category || 'actionability').toLowerCase() as 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness',
              suggestion: s.suggestion || s.content || '',
              context: s.context
            })) : []
        };

        // Additional validation
        if (!['excellent', 'good', 'needs_improvement'].includes(analysis.overallQuality) ||
            typeof analysis.summary !== 'string' ||
            !Array.isArray(analysis.suggestions)) {
          throw new Error('Invalid response structure from OpenAI');
        }

        console.log('Normalized Analysis:', analysis);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        console.log('Raw content:', completion.choices[0].message.content);
        throw new Error('Failed to parse AI response');
      }

      // Store the analysis in localStorage for persistence during editing
      try {
        localStorage.setItem('last_feedback_analysis', JSON.stringify(analysis));
      } catch (error) {
        console.error('Failed to store analysis in localStorage:', error);
      }
      
      // Try to store in Supabase but don't block on failure
      try {
        const { error: storageError } = await supabase
          .from('feedback_analyses')
          .insert({
            strengths: feedbackData.strengths,
            areas_for_improvement: feedbackData.areas_for_improvement,
            analysis: analysis,
            model_version: 'gpt-4',
            prompt_version: '1.0'
          });
          
        if (storageError && storageError.code !== '42501') { // Ignore permission denied
          console.error('Failed to store analysis:', storageError);
        }
      } catch (error) {
        console.error('Failed to store analysis:', error);
      }

      setAiResponse(analysis);
      
      // Mark all steps as completed
      setSteps(prevSteps => prevSteps.map(step => ({
        ...step,
        status: 'completed'
      })));
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze feedback');
      
      // Mark all remaining steps as error
      setSteps(prevSteps => prevSteps.map(step => ({
        ...step,
        status: step.status === 'completed' ? 'completed' : 'error'
      })));
    }
  };

  if (isLoading || !aiResponse) {
    const progress = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle>Analyzing Your Feedback</CardTitle>
          </div>
          <CardDescription>
            {analysisError ? 
              'There was an issue analyzing your feedback. Proceeding with submission...' :
              'Our AI is reviewing your feedback to ensure it\'s as helpful as possible...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={progress} className="w-full" />
          
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : step.status === 'in_progress' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : step.status === 'error' ? (
                  <div className="h-4 w-4 rounded-full bg-red-100" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-gray-100" />
                )}
                <span className={`text-sm ${
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'in_progress' ? 'text-primary' :
                  step.status === 'error' ? 'text-red-500' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Feedback Review</CardTitle>
          {aiResponse && (
            <Badge variant={aiResponse.overallQuality === 'needs_improvement' ? 'destructive' : 
                          aiResponse.overallQuality === 'good' ? 'secondary' : 
                          'default'}>
              {aiResponse.overallQuality.toUpperCase().replace('_', ' ')}
            </Badge>
          )}
        </div>
        {aiResponse && (
          <CardDescription>{aiResponse.summary}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {analysisError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Error</Badge>
              <span className="text-sm font-medium text-red-800">Analysis Failed</span>
            </div>
            <p className="text-sm text-red-700">
              {analysisError}
            </p>
            <p className="text-sm text-red-600">
              You can still submit your feedback, or try analyzing again.
            </p>
          </div>
        )}

        {aiResponse && (
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit Feedback</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Strengths</h4>
                  <div className="relative">
                    <Textarea
                      value={feedbackData.strengths}
                      onChange={(e) => onFeedbackChange?.('strengths', e.target.value)}
                      className="min-h-[150px]"
                      placeholder="What are this person's key strengths?"
                    />
                    {aiResponse.suggestions
                      .filter(s => s.context && s.context.toLowerCase().includes(feedbackData.strengths.toLowerCase()))
                      .map((suggestion, index) => (
                        <div 
                          key={`strength-${index}`}
                          className={`absolute inset-0 pointer-events-none ${
                            suggestion.type === 'critical' ? 'bg-red-100' : 'bg-blue-100'
                          } opacity-10`}
                        />
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Areas for Improvement</h4>
                  <div className="relative">
                    <Textarea
                      value={feedbackData.areas_for_improvement}
                      onChange={(e) => onFeedbackChange?.('areas_for_improvement', e.target.value)}
                      className="min-h-[150px]"
                      placeholder="What could this person improve on?"
                    />
                    {aiResponse.suggestions
                      .filter(s => s.context && s.context.toLowerCase().includes(feedbackData.areas_for_improvement.toLowerCase()))
                      .map((suggestion, index) => (
                        <div 
                          key={`improvement-${index}`}
                          className={`absolute inset-0 pointer-events-none ${
                            suggestion.type === 'critical' ? 'bg-red-100' : 'bg-blue-100'
                          } opacity-10`}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* Critical Suggestions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Critical Improvements Needed</h4>
                    {aiResponse.suggestions
                      .filter(s => s.type === 'critical')
                      .map((suggestion, index) => (
                        <div key={index} className="rounded-lg border bg-red-50 p-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">
                              {categoryLabels[suggestion.category]}
                            </Badge>
                          </div>
                          <p className="text-sm">{suggestion.suggestion}</p>
                          {suggestion.context && (
                            <p className="text-sm text-muted-foreground italic">
                              Context: "{suggestion.context}"
                            </p>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Enhancement Suggestions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Suggested Enhancements</h4>
                    {aiResponse.suggestions
                      .filter(s => s.type === 'enhancement')
                      .map((suggestion, index) => (
                        <div key={index} className="rounded-lg border bg-blue-50 p-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {categoryLabels[suggestion.category]}
                            </Badge>
                          </div>
                          <p className="text-sm">{suggestion.suggestion}</p>
                          {suggestion.context && (
                            <p className="text-sm text-muted-foreground italic">
                              Context: "{suggestion.context}"
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <CardFooter className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={onRevise}
          disabled={isLoading || !aiResponse}>
          Analyze Again
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isLoading || !aiResponse}>
          Submit Feedback
        </Button>
      </CardFooter>
    </Card>
  );
} 