import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

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

export function AiFeedbackReview({ feedbackData, onSubmit, onRevise, isLoading }: Props) {
  const [aiResponse, setAiResponse] = useState<AiFeedbackResponse | null>(null);

  // This would be called automatically when the component mounts
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
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      // If AI analysis fails, we should still allow submission
      onSubmit();
    }
  };

  if (isLoading || !aiResponse) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analyzing Your Feedback</CardTitle>
          <CardDescription>
            Our AI is reviewing your feedback to ensure it's as helpful as possible...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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