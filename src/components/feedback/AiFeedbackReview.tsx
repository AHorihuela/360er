import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from './RichTextEditor';
import { debounce } from 'lodash';
import { AnalysisSteps } from './AnalysisSteps';
import { useAnalysisSteps } from '@/hooks/useAnalysisSteps';
import { useSuggestionFiltering } from '@/hooks/useSuggestionFiltering';
import { useFeedbackPreSubmissionAnalysis } from '@/hooks/useFeedbackPreSubmissionAnalysis';
import { FeedbackFormData } from '@/types/feedback/form';
import { SuggestionCategory } from '@/types/feedback/analysis';

interface Props {
  feedbackData: FeedbackFormData;
  onSubmit: (e?: React.FormEvent) => void | Promise<void>;
  isLoading: boolean;
  feedbackRequestId: string;
  onFeedbackChange?: (field: keyof Pick<FeedbackFormData, 'strengths' | 'areas_for_improvement'>, value: string) => void;
}

const categoryLabels: Record<SuggestionCategory, string> = {
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
} as const;

export function AiFeedbackReview({ 
  feedbackData, 
  onSubmit, 
  isLoading,
  feedbackRequestId,
  onFeedbackChange 
}: Props) {
  const { 
    aiResponse, 
    error: analysisError, 
    analyzeFeedback,
    resetAnalysis
  } = useFeedbackPreSubmissionAnalysis({ feedbackRequestId });

  const { 
    steps, 
    progressToNextStep,
    completeAllSteps, 
    markStepsAsError, 
    resetSteps,
    isAnalyzing,
    setIsAnalyzing
  } = useAnalysisSteps();

  // Only start analysis if we don't have a saved response
  useEffect(() => {
    const shouldStartAnalysis = !aiResponse && 
                              !localStorage.getItem(`feedback_analysis_${feedbackRequestId}`) && 
                              !isAnalyzing;
    
    if (shouldStartAnalysis) {
      console.log('Starting initial analysis');
      setIsAnalyzing(true);
    }
  }, [feedbackRequestId]); // Add feedbackRequestId to dependencies

  // Start analysis when isAnalyzing is set to true
  useEffect(() => {
    if (isAnalyzing) {
      void analyzeFeedback(feedbackData, {
        onStepComplete: progressToNextStep,
        onError: markStepsAsError,
        onComplete: () => {
          completeAllSteps();
          setIsAnalyzing(false);
        }
      });
    }
  }, [isAnalyzing, analyzeFeedback, feedbackData, progressToNextStep, markStepsAsError, completeAllSteps]);

  // Debounce feedback changes
  const debouncedFeedbackChange = useCallback(
    debounce(async (field: keyof Pick<FeedbackFormData, 'strengths' | 'areas_for_improvement'>, value: string) => {
      console.log('Saving feedback change:', { field, value });
      if (onFeedbackChange) {
        await onFeedbackChange(field, value);
      }
    }, 1000), // Increased debounce time to reduce database writes
    [onFeedbackChange]
  );

  // Handle feedback changes
  const handleFeedbackChange = useCallback((field: keyof Pick<FeedbackFormData, 'strengths' | 'areas_for_improvement'>, value: string) => {
    console.log('Handling feedback change:', { field, value });
    debouncedFeedbackChange(field, value);
  }, [debouncedFeedbackChange]);

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
            resetAnalysis();
            resetSteps();
            setIsAnalyzing(true);
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