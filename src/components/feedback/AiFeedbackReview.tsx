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
  const [aiResponse, setAiResponse] = useState<AiFeedbackResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: 'init', label: 'Initializing analysis...', status: 'pending' },
    { id: 'review', label: 'Reviewing feedback content...', status: 'pending' },
    { id: 'evaluate', label: 'Evaluating quality and actionability...', status: 'pending' },
    { id: 'suggest', label: 'Generating improvement suggestions...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing analysis...', status: 'pending' }
  ]);

  useEffect(() => {
    let currentStepIndex = 0;
    const stepInterval = setInterval(() => {
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
    }, 1500); // Update every 1.5 seconds

    // Start the analysis
    analyzeFeedback();

    return () => clearInterval(stepInterval);
  }, []);

  const analyzeFeedback = async () => {
    try {
      const response = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      
      if (!response.ok) throw new Error('Failed to analyze feedback');
      
      const data = await response.json();
      setAiResponse(data);
      
      // Mark all steps as completed
      setSteps(prevSteps => prevSteps.map(step => ({
        ...step,
        status: 'completed'
      })));
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze feedback');
      
      // Mark remaining steps as error
      setSteps(prevSteps => prevSteps.map(step => ({
        ...step,
        status: step.status === 'pending' ? 'error' : step.status
      })));

      // If AI analysis fails, we should still allow submission
      setTimeout(() => {
        onSubmit();
      }, 2000);
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

  const hasCriticalSuggestions = aiResponse.suggestions.some(s => s.type === 'critical');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Feedback Review</CardTitle>
          <Badge 
            variant="secondary" 
            className={qualityColors[aiResponse.overallQuality]}
          >
            {aiResponse.overallQuality.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {aiResponse.summary}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {aiResponse.suggestions.length > 0 && (
          <div className="space-y-3">
            {aiResponse.suggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-4 ${
                  suggestion.type === 'critical' 
                    ? 'bg-red-50 border border-red-100' 
                    : 'bg-yellow-50 border border-yellow-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {categoryLabels[suggestion.category]}
                  </Badge>
                  {suggestion.type === 'critical' && (
                    <Badge variant="destructive">
                      Needs Attention
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{suggestion.suggestion}</p>
                {suggestion.context && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Context: "{suggestion.context}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={onRevise}
          disabled={!hasCriticalSuggestions}
        >
          Revise Feedback
        </Button>
        <Button 
          onClick={onSubmit}
          variant={hasCriticalSuggestions ? "outline" : "default"}
        >
          Submit As Is
        </Button>
      </CardFooter>
    </Card>
  );
} 