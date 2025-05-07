import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SurveyQuestion, StructuredResponses, ReviewCycleType } from '@/types/survey';
import { LikertScaleQuestion } from './LikertScaleQuestion';
import { OpenEndedQuestion } from './OpenEndedQuestion';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  // Debug logging
  console.log('DynamicSurveyForm - Received questions:', questions);
  
  // Sort questions by order property
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  console.log('DynamicSurveyForm - Sorted questions:', sortedQuestions);
  
  // Get current question
  const currentQuestion = sortedQuestions[currentStep];
  console.log('DynamicSurveyForm - Current question:', currentQuestion);
  
  // Calculate progress
  const progress = Math.round((currentStep / sortedQuestions.length) * 100);

  // Check if current question is answered
  useEffect(() => {
    if (!currentQuestion) {
      console.error('No current question found at step:', currentStep);
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
    console.log('Question validity check:', { questionId: currentQuestion.id, response, isValid });
  }, [responses, currentQuestion, currentStep]);

  // Handle question response change
  const handleResponseChange = (questionId: string, value: string | number) => {
    console.log('Response change:', { questionId, value });
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
    
    // Validate all questions have been answered
    const allQuestionsAnswered = sortedQuestions.every(q => {
      const response = responses[q.id];
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

  // Format the display name based on survey type
  const displayName = surveyType === '360_review' 
    ? employeeName 
    : `your manager${employeeName ? ` (${employeeName})` : ''}`;

  // Display name in the form title
  const formTitle = surveyType === '360_review'
    ? `Provide feedback for ${displayName}`
    : `Share your experience with ${displayName}`;

  // Display role if available
  const roleDisplay = employeeRole ? ` - ${employeeRole}` : '';

  // Render the appropriate question component based on type
  const renderQuestion = (question: SurveyQuestion) => {
    console.log('Rendering question:', question);
    
    if (!question) {
      console.error('Attempted to render undefined question');
      return <div>Error: Question not found</div>;
    }
    
    switch (question.questionType) {
      case 'likert':
        console.log('Rendering likert question with options:', question.options);
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
        // Generate placeholder based on the question and survey type
        const placeholder = surveyType === '360_review'
          ? `Share your thoughts about ${employeeName}...`
          : 'Share your thoughts and experiences...';
          
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
        console.error('Unknown question type:', question.questionType);
        return <div>Unsupported question type: {question.questionType}</div>;
    }
  };

  // Debug UI rendering
  if (sortedQuestions.length === 0) {
    console.error('No questions available to render');
    return <div className="p-4 border border-red-500 rounded">Error: No questions found for this survey type.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold">{formTitle}</h2>
            <p className="text-muted-foreground">{roleDisplay}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Question {currentStep + 1} of {sortedQuestions.length}</span>
                <span>{progress}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentQuestion ? (
              renderQuestion(currentQuestion)
            ) : (
              <div className="p-4 border border-red-500 rounded">Error: Current question not found</div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < sortedQuestions.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!allValid || isSubmitting}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!allValid || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Feedback
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 