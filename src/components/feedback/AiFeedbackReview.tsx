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

export function AiFeedbackReview({ feedbackData, onSubmit, onRevise, isLoading }: Props) {
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
            content: `You are an expert in performance reviews and feedback. Analyze the provided feedback and provide structured suggestions for improvement in JSON format. Focus on:

1. Clarity: Is the feedback clear and easy to understand?
2. Specificity: Does it include specific examples and behaviors?
3. Actionability: Are there concrete suggestions for improvement?
4. Tone: Is the feedback constructive and professional?
5. Completeness: Are all aspects adequately addressed?

Return your analysis as a JSON object with overallQuality, summary, and suggestions.
Categorize suggestions as either 'critical' (must be addressed) or 'enhancement' (would improve but not essential).`
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
                         parsedResponse.overallQuality.toLowerCase() as 'excellent' | 'good' | 'needs_improvement',
          summary: typeof parsedResponse.summary === 'object' ? 
                  Object.values(parsedResponse.summary).join(' ') : 
                  parsedResponse.summary,
          suggestions: Array.isArray(parsedResponse.suggestions) ? 
            parsedResponse.suggestions.map((s: { 
              type: string; 
              category: string; 
              suggestion: string; 
              context?: string; 
            }) => ({
              type: s.type.toLowerCase() as 'critical' | 'enhancement',
              category: s.category.toLowerCase() as 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness',
              suggestion: s.suggestion,
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
        {!aiResponse && !analysisError && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-muted-foreground animate-pulse" />
              <span className="text-sm text-muted-foreground">Analyzing feedback...</span>
            </div>
            {steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {step.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step.status === 'pending' && <div className="h-4 w-4 rounded-full border" />}
                  <span className={`text-sm ${step.status === 'completed' ? 'text-muted-foreground line-through' : 
                                           step.status === 'in_progress' ? 'text-foreground' : 
                                           'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {step.status === 'in_progress' && (
                  <Progress value={100} className="h-1" />
                )}
              </div>
            ))}
          </div>
        )}

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
                        Context: {suggestion.context}
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
                        Context: {suggestion.context}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={onRevise}
          disabled={isLoading || !aiResponse}>
          Revise Feedback
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isLoading || !aiResponse}>
          Submit As Is
        </Button>
      </CardFooter>
    </Card>
  );
} 