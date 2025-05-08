import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SurveyQuestion, StructuredResponses, ReviewCycleType } from '@/types/survey';
import { LikertScaleQuestion } from './LikertScaleQuestion';
import { OpenEndedQuestion } from './OpenEndedQuestion';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DynamicSurveyFormProps {
  questions: SurveyQuestion[];
  surveyType: ReviewCycleType;
  employeeName: string;
  employeeRole: string;
  onSubmit: (responses: StructuredResponses) => Promise<void>;
  isSubmitting: boolean;
}

export function DynamicSurveyForm({
  questions,
  surveyType,
  employeeName,
  employeeRole,
  onSubmit,
  isSubmitting
}: DynamicSurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<StructuredResponses>({});
  const [allValid, setAllValid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  // Sort questions by order property
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  
  // Get current question
  const currentQuestion = sortedQuestions[currentStep];
  
  // Calculate progress
  const progress = Math.round((currentStep / sortedQuestions.length) * 100);

  // Check if current question is answered
  useEffect(() => {
    if (!currentQuestion) {
      console.error('No current question found at step:', currentStep);
      return;
    }
    
    // Check if this is the optional "additional feedback" question
    const isOptionalQuestion = currentQuestion.questionText?.includes('additional feedback you would like to share');
    
    // If it's the optional question, it's always valid
    if (isOptionalQuestion) {
      setAllValid(true);
      return;
    }
    
    const response = responses[currentQuestion.id];
    let isValid = false;
    
    if (currentQuestion.questionType === 'likert') {
      isValid = response !== undefined;
    } else if (currentQuestion.questionType === 'open_ended') {
      // For open-ended questions, check if there's any text
      isValid = typeof response === 'string' && response.trim().length > 0;
    }
    
    setAllValid(isValid);
  }, [responses, currentQuestion, currentStep]);

  // Handle question response change
  const handleResponseChange = (questionId: string, value: string | number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Navigate to next question
  const handleNext = () => {
    if (currentStep < sortedQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowValidation(false);
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowValidation(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all questions have been answered, except the last optional one
    const allQuestionsAnswered = sortedQuestions.every(q => {
      const response = responses[q.id];
      
      // Check if this is the optional "additional feedback" question
      const isOptionalQuestion = q.questionText?.includes('additional feedback you would like to share');
      
      // If it's the optional question, no response is fine
      if (isOptionalQuestion) {
        return true;
      }
      
      // Otherwise, require a response
      return response !== undefined && 
             (typeof response !== 'string' || response.trim().length > 0);
    });
    
    if (!allQuestionsAnswered) {
      setShowValidation(true);
      return;
    }
    
    try {
      await onSubmit(responses);
    } catch (error) {
      console.error('Error submitting survey:', error);
    }
  };

  // Render the appropriate question component based on type
  const renderQuestion = (question: SurveyQuestion) => {
    if (!question) {
      return <div>Error: Question not found</div>;
    }
    
    switch (question.questionType) {
      case 'likert':
        return (
          <LikertScaleQuestion
            key={question.id}
            id={question.id}
            questionText={question.questionText}
            options={question.options || []}
            value={responses[question.id] as number | undefined}
            onChange={(value) => handleResponseChange(question.id, value)}
          />
        );
      case 'open_ended':
        // Generate placeholder based on the question
        const placeholder = 'Share your thoughts and experiences...';
          
        return (
          <OpenEndedQuestion
            key={question.id}
            id={question.id}
            questionText={question.questionText}
            value={(responses[question.id] as string) || ''}
            onChange={(value) => handleResponseChange(question.id, value)}
            placeholder={placeholder}
            showValidation={showValidation}
          />
        );
      default:
        return <div>Unsupported question type: {question.questionType}</div>;
    }
  };

  // Debug UI rendering
  if (sortedQuestions.length === 0) {
    return <div className="p-4 border border-red-500 rounded">Error: No questions found for this survey type.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-0 pt-4 px-4 sm:px-8 sm:pt-6">
          {/* Show question counter and completion percentage in one row */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Question {currentStep + 1} of {sortedQuestions.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {progress}% complete
            </span>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-2 mt-3" />
        </CardHeader>

        <CardContent className="pt-5 pb-6 px-4 sm:px-8">
          <form className="space-y-4">
            {currentQuestion ? (
              renderQuestion(currentQuestion)
            ) : (
              <div className="p-4 border border-red-500 rounded">Error: Current question not found</div>
            )}
          </form>
        </CardContent>
      </Card>
      
      {/* Navigation buttons outside of card */}
      <div className="flex justify-between mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0 || isSubmitting}
          size="sm"
          className="w-28 sm:w-32 h-10"
        >
          <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Previous</span>
        </Button>

        {currentStep < sortedQuestions.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!allValid || isSubmitting}
            size="sm"
            className="w-28 sm:w-32 h-10"
          >
            <span className="text-xs sm:text-sm">Next</span>
            <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!allValid || isSubmitting}
            className="bg-green-600 hover:bg-green-700 w-28 sm:w-32 h-10"
            size="sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Submitting...</span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm">Submit</span>
                <Send className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 