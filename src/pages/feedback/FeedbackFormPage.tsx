import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { anonymousClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { AiFeedbackReview } from '@/components/feedback/AiFeedbackReview';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { useFeedbackFormState } from '@/hooks/useFeedbackFormState';
import { FeedbackRequest } from '@/types/feedback/submission';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { type RelationshipType } from '@/types/feedback/base';
import { ReviewCycleType, SurveyQuestion, StructuredResponses } from '@/types/survey';
import { DynamicSurveyForm } from '@/components/survey/DynamicSurveyForm';
import { getSurveyQuestions, submitSurveyResponses } from '@/api/surveyQuestions';
import { Button } from '@/components/ui/button';
import { debugFeedbackRequestState, validateDueDateAccess, testDatabasePolicyEnforcement } from '@/utils/dueDateValidation';

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper function to check if review cycle is still accepting submissions
function isReviewCycleOpen(reviewByDate: string): boolean {
  const dueDate = new Date(reviewByDate);
  const currentDate = new Date();
  
  // Set both dates to midnight for fair comparison
  dueDate.setHours(23, 59, 59, 999); // End of due date
  currentDate.setHours(0, 0, 0, 0);   // Start of current date
  
  return currentDate <= dueDate;
}

export function FeedbackFormPage() {
  const { toast } = useToast();
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [sessionId] = useState(() => generateSessionId());
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false);
  const [isDueDatePassed, setIsDueDatePassed] = useState(false);

  const { submitFeedback, isSubmitting } = useFeedbackSubmission();
  const {
    formData,
    formState,
    updateFormData,
    updateFormState,
    markAsSubmitted,
    startSubmission,
    handleSubmissionFailure,
    isSubmitted
  } = useFeedbackFormState({ uniqueLink: uniqueLink || '' });

  // Safely get the review cycle type with a default value
  const getSurveyType = (): ReviewCycleType => {
    if (feedbackRequest && 
        feedbackRequest.review_cycle && 
        'type' in feedbackRequest.review_cycle) {
      return feedbackRequest.review_cycle.type as unknown as ReviewCycleType;
    }
    return '360_review'; // Default to 360 review for backward compatibility
  };
  
  const reviewCycleType = getSurveyType();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Check if feedback was already submitted
        if (isSubmitted) {
          console.log('Feedback already submitted, redirecting to thank you page');
          navigate('/feedback/thank-you');
          return;
        }

        const request = await fetchFeedbackRequest();
        
        if (request && request.review_cycle) {
          // Removed debug function that was creating test records in database
          
          // Check if due date has passed
          const isOpen = isReviewCycleOpen(request.review_cycle.review_by_date);
          setIsDueDatePassed(!isOpen);
          
          if (!isOpen) {
            console.log('Review cycle due date has passed:', request.review_cycle.review_by_date);
            // Don't show toast - the dedicated "Feedback Period Closed" page is sufficient
            return;
          }
          
          if ('type' in request.review_cycle) {
            // Fetch questions based on the review cycle type
            const cycleType = request.review_cycle.type as unknown as ReviewCycleType;
            console.log('FeedbackFormPage - Found review cycle type:', cycleType);
            
            try {
              const questions = await getSurveyQuestions(cycleType);
              console.log('FeedbackFormPage - Loaded survey questions:', questions);
              setSurveyQuestions(questions);
            } catch (error) {
              console.error('FeedbackFormPage - Error loading survey questions:', error);
            }
          } else {
            console.warn('FeedbackFormPage - Unable to determine review cycle type from:', request?.review_cycle);
          }
        }
      } catch (error) {
        console.error('Error fetching feedback request:', error);
        toast({
          title: "Error",
          description: "Failed to load feedback form. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [uniqueLink, isSubmitted, navigate, toast]);

  async function fetchFeedbackRequest() {
    if (!uniqueLink) {
      throw new Error('No feedback link provided');
    }

    try {
      // Clean the unique link by removing any trailing dashes
      const cleanLink = uniqueLink.replace(/[-]+$/, '');
      console.log('Fetching feedback request with cleaned link:', cleanLink);

      // Use anonymous client for feedback operations - avoid automatic joins to prevent PostgREST errors
      const { data: requestData, error: requestError } = await anonymousClient
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          status,
          unique_link,
          target_responses
        `)
.eq('unique_link', cleanLink)
        .single();

      if (requestError) {
        console.error('Error verifying feedback request:', requestError);
        throw requestError;
      }

      if (!requestData) {
        throw new Error('Feedback request not found');
      }

      // Fetch employee data separately to avoid PostgREST relationship issues
      const { data: employeeData, error: employeeError } = await anonymousClient
        .from('employees')
        .select('id, name, role, user_id')
        .eq('id', requestData.employee_id)
        .single();

      if (employeeError) throw employeeError;

      // Fetch review_cycle data separately  
      const { data: reviewCycleData, error: cycleError } = await anonymousClient
        .from('review_cycles')
        .select('id, title, review_by_date, status, type')
        .eq('id', requestData.review_cycle_id)
        .single();

      if (cycleError) throw cycleError;

      // Manually combine the data
      const combinedRequestData = {
        ...requestData,
        employee: employeeData,
        review_cycle: reviewCycleData
      };

      console.log('Initial request result:', { requestData: combinedRequestData, requestError: null });

      // Fetch feedback data - make session_id optional to handle database schema differences
      const { data: feedback, error: feedbackError } = await anonymousClient
        .from('feedback_responses')
        .select(`
          id,
          feedback_request_id,
          submitted_at,
          status,
          strengths,
          areas_for_improvement,
          relationship,
          responses,
          created_at
        `)
        .eq('feedback_request_id', requestData.id);

      // Try to fetch session_id separately if needed (graceful degradation)
      let feedbackWithSession = feedback;
      if (feedback && feedback.length > 0) {
        try {
          const { data: sessionData } = await anonymousClient
            .from('feedback_responses')
            .select('id, session_id')
            .eq('feedback_request_id', requestData.id);
          
          // Merge session data if available
          if (sessionData) {
            feedbackWithSession = feedback.map(item => {
              const sessionInfo = sessionData.find(s => s.id === item.id);
              return {
                ...item,
                session_id: sessionInfo?.session_id || null
              };
            });
          }
        } catch (sessionError) {
          // Session ID not available - continue without it
          console.warn('Session ID not available in database, proceeding without session tracking');
        }
      }

      console.log('Feedback result:', { feedback: feedbackWithSession, feedbackError });

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
        throw feedbackError;
      }

      // Check for any existing feedback from this session (both submitted and in-progress)
      if (feedbackWithSession) {
        console.log('Found feedback data:', feedbackWithSession);
        const existingFeedback = feedbackWithSession.find(
          f => (f as any).session_id === sessionId
        );

        if (existingFeedback) {
          console.log('Found existing feedback for this session:', existingFeedback);
          
          if (existingFeedback.status === 'submitted') {
            console.log('Found submitted feedback for this session');
            markAsSubmitted();
            return null;
          }

          if (existingFeedback.status === 'in_progress') {
            console.log('Found existing in-progress feedback:', existingFeedback);
            updateFormState({
              draftId: existingFeedback.id,
              step: formState.step,
              aiAnalysisAttempted: formState.aiAnalysisAttempted
            });

            // For traditional 360 reviews, update the form data
            if (!existingFeedback.responses) {
              updateFormData({
                relationship: (existingFeedback.relationship || 'equal_colleague') as RelationshipType,
                strengths: existingFeedback.strengths || '',
                areas_for_improvement: existingFeedback.areas_for_improvement || ''
              });
            }
            // For structured surveys, responses are in the responses field
            // The dynamic form will handle loading from this state
          }
        }
      }

      // Combine the data using our manually linked data
      const combinedData: FeedbackRequest = {
        ...combinedRequestData,
        feedback: feedbackWithSession as CoreFeedbackResponse[]
      };

      console.log('Setting feedback request with data:', combinedData);
      setFeedbackRequest(combinedData);
      return combinedData;

    } catch (error) {
      console.error('Error fetching feedback request:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback form. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  async function saveFeedbackResponse(isSubmitting: boolean = false): Promise<string | null> {
    if (!feedbackRequest || !uniqueLink || !feedbackRequest.id) {
      console.error('Missing required data:', { 
        hasFeedbackRequest: !!feedbackRequest,
        hasUniqueLink: !!uniqueLink,
        hasFeedbackRequestId: !!feedbackRequest?.id
      });
      return null;
    }

    try {
      console.log('=== Starting saveFeedbackResponse ===');
      console.log('Session ID:', sessionId);
      console.log('Feedback Request ID:', feedbackRequest.id);
      console.log('Unique Link:', uniqueLink);
      console.log('Current form state:', formState);

      // Clean the unique link by removing any trailing dashes
      const cleanLink = uniqueLink.replace(/[-]+$/, '');

      // Use anonymous client for feedback operations
      const { data: verifiedRequest, error: verifyError } = await anonymousClient
        .from('feedback_requests')
        .select('id, unique_link')
        .eq('id', feedbackRequest.id)
.eq('unique_link', cleanLink)
        .single();

      if (verifyError || !verifiedRequest) {
        console.error('Error verifying feedback request:', verifyError);
        throw new Error('Invalid feedback request or unique link');
      }

      const currentTime = new Date().toISOString();
      const feedbackData = {
        feedback_request_id: feedbackRequest.id,
        session_id: sessionId,
        relationship: formData.relationship,
        strengths: formData.strengths.trim(),
        areas_for_improvement: formData.areas_for_improvement.trim(),
        status: isSubmitting ? 'submitted' : 'in_progress',
        submitted_at: isSubmitting ? currentTime : null,
        created_at: formState.draftId ? undefined : currentTime
      };

      console.log('Prepared feedback data:', JSON.stringify(feedbackData, null, 2));
      console.log('Validation check:', {
        hasFeedbackRequest: !!feedbackRequest,
        hasUniqueLink: !!uniqueLink,
        hasSessionId: !!sessionId,
        relationshipType: formData.relationship,
        strengthsLength: formData.strengths.length,
        improvementsLength: formData.areas_for_improvement.length
      });

      // First try to find any existing draft
      const { data: existingResponses, error: searchError } = await anonymousClient
        .from('feedback_responses')
        .select('id, status, created_at')
        .eq('feedback_request_id', feedbackRequest.id)
        .eq('session_id', sessionId)
        .eq('status', 'in_progress');

      if (searchError) {
        console.error('Error searching for existing responses:', searchError);
        throw searchError;
      }

      console.log('Search results:', { existingResponses, searchError });

      // If we found an existing draft, update it
      if (existingResponses && existingResponses.length > 0) {
        const existingDraftId = existingResponses[0].id;
        console.log('Found existing draft:', existingDraftId);

        const { error: updateError } = await anonymousClient
          .from('feedback_responses')
          .update(feedbackData)
          .eq('id', existingDraftId)
          .eq('session_id', sessionId)
          .eq('status', 'in_progress');

        if (updateError) {
          console.error('Error updating existing draft:', updateError);
          throw updateError;
        }

        console.log('Successfully updated existing draft');
        return existingDraftId;
      }

      // If no existing draft was found, create a new one
      console.log('No existing draft found, creating new response');
      const { data: newResponse, error: insertError } = await anonymousClient
        .from('feedback_responses')
        .insert([feedbackData])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating new response:', insertError.message);
        console.error('Error details:', {
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      if (!newResponse) {
        console.error('No response data received after insert');
        throw new Error('Failed to create feedback response');
      }

      console.log('Successfully created new response:', newResponse);
      return newResponse.id;

    } catch (error) {
      console.error('Error in saveFeedbackResponse:', error);
      throw error;
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }

    if (!feedbackRequest || !uniqueLink) {
      console.error('Missing feedbackRequest or uniqueLink');
      toast({
        title: "Error",
        description: "Required data is missing. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== Handle Submit Started ===');
    console.log('Current step:', formState.step);
    console.log('AI analysis attempted:', formState.aiAnalysisAttempted);

    try {
      // Always save the latest changes first
      const draftId = await saveFeedbackResponse(false);
      
      if (!draftId) {
        console.error('Failed to save latest changes');
        toast({
          title: "Error",
          description: "Failed to save feedback. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // If we're in the editing state and haven't done AI analysis yet
      if (formState.step === 'form' && !formState.aiAnalysisAttempted) {
        console.log('Moving to AI review with draft:', draftId);
        
        // Update form state with new draft ID and move to AI review
        updateFormState({
          step: 'ai_review',
          aiAnalysisAttempted: true,
          draftId
        });
        
        return;
      }

      // If we're in AI review or have already done AI analysis, proceed to submission
      console.log('Moving to submission phase with latest draft:', draftId);
      startSubmission();
      
      const success = await submitFeedback(formData, {
        feedbackRequestId: feedbackRequest.id,
        uniqueLink,
        sessionId,
        draftId
      });

      if (!success) {
        console.log('Submission failed, handling failure');
        handleSubmissionFailure();
      } else {
        console.log('Submission completed successfully');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }

  // New handler for submitting survey responses
  const handleSurveySubmit = async (responses: StructuredResponses) => {
    if (!feedbackRequest || !uniqueLink) {
      toast({
        title: "Error",
        description: "Invalid survey data.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSurveySubmitting(true);

      // Submit the structured responses
      await submitSurveyResponses(
        feedbackRequest.id,
        formData.relationship, // Use the same relationship from the form state
        responses,
        sessionId
      );

      // Mark as submitted and redirect to thank you page
      markAsSubmitted();
      navigate('/feedback/thank-you');
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        title: "Error",
        description: "Failed to submit survey. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSurveySubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading feedback form...</div>
      </div>
    );
  }

  if (!feedbackRequest || !uniqueLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold">Feedback Link Not Found</h1>
        <p className="max-w-md text-muted-foreground">
          This feedback link is invalid or has expired. Please check the URL and try again.
        </p>
      </div>
    );
  }

  if (isDueDatePassed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg 
              className="h-8 w-8 text-orange-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900">
            Feedback Period Closed
          </h1>

          {/* Message */}
          <p className="text-gray-600">
            This review closed on{' '}
            <span className="font-medium text-gray-900">
              {new Date(feedbackRequest.review_cycle.review_by_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>.
          </p>
        </div>
      </div>
    );
  }

  // Render the appropriate form based on the review cycle type
  return (
    <div className="container max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {reviewCycleType === '360_review' 
              ? 'Share Your Feedback' 
              : reviewCycleType === 'manager_effectiveness'
                ? (showNames 
                  ? `Manager Effectiveness Survey: ${feedbackRequest?.employee?.name || 'Manager'}`
                  : 'Manager Effectiveness Survey')
                : (showNames
                  ? `Manager to Employee Feedback: ${feedbackRequest?.employee?.name || 'Employee'}`
                  : 'Manager to Employee Feedback')}
          </h1>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNames(!showNames)}
            className="flex items-center gap-1 ml-2 px-2"
            title={showNames ? "Hide Names" : "Show Names"}
          >
            {showNames ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="hidden sm:inline text-xs">{showNames ? "Hide" : "Show"}</span>
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          {reviewCycleType === '360_review' 
            ? 'Provide anonymous feedback to help your colleague grow and improve.'
            : reviewCycleType === 'manager_effectiveness'
            ? 'Share your anonymous feedback about your manager to help improve team effectiveness.'
            : 'Receive feedback from your manager to support your professional development.'}
        </p>
      </div>

      {reviewCycleType === '360_review' ? (
        // Traditional 360 review form with AI analysis
        formState.step === 'form' ? (
          <FeedbackForm
            employeeName={feedbackRequest?.employee?.name || 'Employee'}
            employeeRole={feedbackRequest?.employee?.role || ''}
            showNames={showNames}
            formData={formData}
            onFormDataChange={updateFormData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        ) : formState.step === 'ai_review' ? (
          <AiFeedbackReview
            feedbackData={formData}
            feedbackRequestId={feedbackRequest?.id || ''}
            onFeedbackChange={(field, value) => updateFormData({ [field]: value })}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-lg">Submitting feedback...</div>
          </div>
        )
      ) : (
        // Dynamic survey form for manager effectiveness
        <>
          {process.env.NODE_ENV === 'development' && surveyQuestions.length === 0 && (
            <div className="mb-4 p-4 border border-red-500 rounded bg-red-50">
              <p className="font-bold">No survey questions loaded</p>
              <p>Check the browser console for errors.</p>
            </div>
          )}
          <DynamicSurveyForm
            questions={surveyQuestions}
            surveyType={reviewCycleType}
            employeeName={showNames ? feedbackRequest?.employee?.name || '' : ''}
            employeeRole={feedbackRequest?.employee?.role || ''}
            onSubmit={handleSurveySubmit}
            isSubmitting={isSurveySubmitting}
          />
        </>
      )}
    </div>
  );
} 