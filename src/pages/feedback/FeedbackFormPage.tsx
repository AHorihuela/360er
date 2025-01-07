import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, setSessionId } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { AiFeedbackReview } from '@/components/feedback/AiFeedbackReview';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { useFeedbackFormState } from '@/hooks/useFeedbackFormState';
import { FeedbackRequest } from '@/types/feedback/submission';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { type RelationshipType } from '@/types/feedback/base';
import { Employee, ReviewCycle } from '@/types/review';

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function FeedbackFormPage() {
  const { toast } = useToast();
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [sessionId] = useState(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    return newSessionId;
  });

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

        await fetchFeedbackRequest();
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
      // First, verify the feedback request exists
      console.log('Fetching feedback request with unique link:', uniqueLink);
      const { data: requestData, error: requestError } = await supabase
        .from('feedback_requests')
        .select('id, unique_link')
        .eq('unique_link', uniqueLink)
        .single();

      console.log('Initial request result:', { requestData, requestError });

      if (requestError) {
        console.error('Error verifying feedback request:', requestError);
        throw requestError;
      }

      // Then fetch all the data
      console.log('Fetching full data for request ID:', requestData.id);
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          status,
          unique_link,
          target_responses,
          employee:employees (
            id,
            name,
            role,
            user_id
          )
        `)
        .eq('id', requestData.id)
        .single();

      console.log('Initial data result:', { data, error });

      if (error) {
        console.error('Error fetching feedback request:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No feedback request found');
      }

      // Fetch review cycle data separately
      const { data: reviewCycle, error: reviewCycleError } = await supabase
        .from('review_cycles')
        .select('id, title, review_by_date, status')
        .eq('id', data.review_cycle_id)
        .single();

      console.log('Review cycle result:', { reviewCycle, reviewCycleError });

      if (reviewCycleError) {
        console.error('Error fetching review cycle:', reviewCycleError);
        throw reviewCycleError;
      }

      // Fetch feedback data
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_responses')
        .select(`
          id,
          feedback_request_id,
          submitted_at,
          status,
          session_id,
          strengths,
          areas_for_improvement,
          relationship,
          created_at
        `)
        .eq('feedback_request_id', data.id);

      console.log('Feedback result:', { feedback, feedbackError });

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
        throw feedbackError;
      }

      // Check for any existing feedback from this session (both submitted and in-progress)
      if (feedback) {
        console.log('Found feedback data:', feedback);
        const existingFeedback = feedback.find(
          f => f.session_id === sessionId
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

            updateFormData({
              relationship: (existingFeedback.relationship || 'equal_colleague') as RelationshipType,
              strengths: existingFeedback.strengths || '',
              areas_for_improvement: existingFeedback.areas_for_improvement || ''
            });
          }
        }
      }

      // Combine the data
      const combinedData: FeedbackRequest = {
        ...data,
        employee: (Array.isArray(data.employee) ? data.employee[0] : data.employee) as Employee,
        review_cycle: reviewCycle as ReviewCycle,
        feedback: feedback as CoreFeedbackResponse[]
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

      // Verify the feedback request exists and has a unique link
      const { data: verifiedRequest, error: verifyError } = await supabase
        .from('feedback_requests')
        .select('id, unique_link')
        .eq('id', feedbackRequest.id)
        .eq('unique_link', uniqueLink)
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
      const { data: existingResponses, error: searchError } = await supabase
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

        const { error: updateError } = await supabase
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
      const { data: newResponse, error: insertError } = await supabase
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

  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!feedbackRequest || !feedbackRequest.employee || !feedbackRequest.review_cycle) {
    console.log('Missing required data:', {
      hasFeedbackRequest: !!feedbackRequest,
      hasEmployee: !!feedbackRequest?.employee,
      hasReviewCycle: !!feedbackRequest?.review_cycle
    });
    return null;
  }

  // Only check for review cycle end date, not status
  const isRequestClosed = feedbackRequest.review_cycle.review_by_date && 
    new Date(feedbackRequest.review_cycle.review_by_date) < new Date();

  if (isRequestClosed) {
    console.log('Request is closed, review_by_date:', feedbackRequest.review_cycle.review_by_date);
    return (
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Feedback Form Closed</h1>
          <p className="mt-4 text-muted-foreground">
            This review cycle has ended.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Due by: {new Date(feedbackRequest.review_cycle.review_by_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  console.log('Rendering feedback form with data:', {
    employeeName: feedbackRequest.employee.name,
    reviewCycleTitle: feedbackRequest.review_cycle.title,
    formStep: formState.step
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="relative text-center">
        <button
          onClick={() => setShowNames(!showNames)}
          className="absolute right-0 top-0 p-2"
          type="button"
          title={showNames ? "Hide names" : "Show names"}
        >
          {showNames ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Feedback Form for {showNames ? feedbackRequest.employee.name : 'Employee'}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Providing feedback for {showNames ? feedbackRequest.employee.name : 'Employee'} - {feedbackRequest.employee.role}
        </p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Review cycle: {feedbackRequest.review_cycle.title}
        </p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Due by: {new Date(feedbackRequest.review_cycle.review_by_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        {(formData.strengths || formData.areas_for_improvement) && (
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Draft saved automatically
          </p>
        )}
      </div>

      {formState.step === 'submitting' ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg">Submitting your feedback...</p>
          </div>
        </div>
      ) : formState.step === 'ai_review' ? (
        <AiFeedbackReview
          feedbackData={formData}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          feedbackRequestId={feedbackRequest.id}
          onFeedbackChange={async (field, value) => {
            updateFormData({ [field]: value });
          }}
        />
      ) : (
        <FeedbackForm
          employeeName={feedbackRequest.employee.name}
          employeeRole={feedbackRequest.employee.role}
          showNames={showNames}
          formData={formData}
          onFormDataChange={updateFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 