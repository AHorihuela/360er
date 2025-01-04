import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, setSessionId } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { validateFeedback } from '@/utils/feedbackValidation';
import { AiFeedbackReview } from '@/components/feedback/AiFeedbackReview';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { useFeedbackFormState } from '@/hooks/useFeedbackFormState';
import { FeedbackRequest, FeedbackResponse } from '@/types/feedback/submission';

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function FeedbackFormPage() {
  const { toast } = useToast();
  const { uniqueLink } = useParams();
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
    clearSavedData,
    markAsSubmitted,
    moveToAiReview,
    moveToEditing,
    startSubmission,
    handleSubmissionFailure,
    isSubmitted
  } = useFeedbackFormState({
    uniqueLink: uniqueLink || '',
    sessionId
  });

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
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          status,
          unique_link,
          target_responses,
          feedback:feedback_responses(
            id,
            feedback_request_id,
            submitted_at,
            status,
            session_id,
            strengths,
            areas_for_improvement,
            relationship
          )
        `)
        .eq('unique_link', uniqueLink)
        .single();

      if (error) {
        console.error('Error fetching feedback request:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No feedback request found');
      }

      // Check for any existing feedback from this session (both submitted and in-progress)
      if (data.feedback) {
        const existingFeedback = (data.feedback as FeedbackResponse[]).find(
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
              relationship: existingFeedback.relationship || 'equal_colleague',
              strengths: existingFeedback.strengths || '',
              areas_for_improvement: existingFeedback.areas_for_improvement || ''
            });
          }
        }
      }

      // Get the employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', data.employee_id)
        .single();

      if (employeeError) throw employeeError;
      if (!employeeData) throw new Error('Employee not found');

      // Get the review cycle data
      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', data.review_cycle_id)
        .single();

      if (cycleError) throw cycleError;
      if (!cycleData) throw new Error('Review cycle not found');

      // Combine the data
      const combinedData: FeedbackRequest = {
        ...data,
        employee: employeeData,
        review_cycle: cycleData,
        feedback: data.feedback as FeedbackResponse[]
      };

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
    if (!feedbackRequest || !uniqueLink) {
      console.error('Missing feedbackRequest or uniqueLink');
      return null;
    }

    try {
      console.log('=== Starting saveFeedbackResponse ===');
      console.log('Session ID:', sessionId);
      console.log('Feedback Request ID:', feedbackRequest.id);
      console.log('Current form state:', formState);

      const currentTime = new Date().toISOString();
      const feedbackData = {
        feedback_request_id: feedbackRequest.id,
        session_id: sessionId,
        relationship: formData.relationship,
        strengths: formData.strengths.trim(),
        areas_for_improvement: formData.areas_for_improvement.trim(),
        status: isSubmitting ? 'submitted' : 'in_progress',
        submitted_at: isSubmitting ? currentTime : null
      };

      console.log('Prepared feedback data:', feedbackData);

      // First try to find any existing draft, regardless of formState.draftId
      const { data: existingResponses, error: searchError } = await supabase
        .from('feedback_responses')
        .select('id, status')
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
        console.error('Error creating new response:', insertError);
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
      throw error; // Let the caller handle the error
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

    // If we're in the editing state and haven't done AI analysis yet
    if (formState.step === 'editing' && !formState.aiAnalysisAttempted) {
      try {
        console.log('Attempting to save draft and move to AI review');
        
        // Try to save the feedback response
        const draftId = await saveFeedbackResponse(false).catch(error => {
          console.error('Error saving feedback response:', error);
          toast({
            title: "Error",
            description: "Failed to save feedback. Please try again.",
            variant: "destructive",
          });
          return null;
        });

        if (!draftId) {
          console.error('Failed to get draft ID');
          return;
        }

        console.log('Draft saved successfully with ID:', draftId);
        
        // Update form state with new draft ID and move to AI review
        updateFormState({
          step: 'ai_review',
          aiAnalysisAttempted: true,
          draftId
        });

        console.log('Form state updated, moving to AI review');
        
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // If we're in AI review or have already done AI analysis, proceed to submission
    console.log('Moving to submission phase');
    startSubmission();
    
    const success = await submitFeedback(formData, {
      feedbackRequestId: feedbackRequest.id,
      uniqueLink,
      sessionId,
      draftId: formState.draftId
    });

    if (!success) {
      console.log('Submission failed, handling failure');
      handleSubmissionFailure();
    } else {
      console.log('Submission completed successfully');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!feedbackRequest || !feedbackRequest.employee || !feedbackRequest.review_cycle) return null;

  // Only check for review cycle end date, not status
  const isRequestClosed = feedbackRequest.review_cycle.review_by_date && 
    new Date(feedbackRequest.review_cycle.review_by_date) < new Date();

  if (isRequestClosed) {
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
          onRevise={moveToEditing}
          isLoading={isSubmitting}
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