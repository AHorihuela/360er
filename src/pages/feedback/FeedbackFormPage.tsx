import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { validateFeedback } from '@/utils/feedbackValidation';
import { AiFeedbackReview } from '@/components/feedback/AiFeedbackReview';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';

interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  status: string;
  employee: {
    name: string;
    role: string;
  };
  review_cycle: {
    title: string;
    review_by_date: string;
  };
}

interface FeedbackFormData {
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string;
  areas_for_improvement: string;
}

interface FeedbackFormState {
  step: 'editing' | 'ai_review' | 'submitting';
  aiAnalysisAttempted: boolean;
  draftId?: string;
}

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
  const [formData, setFormData] = useState<FeedbackFormData>({
    relationship: 'equal_colleague',
    strengths: '',
    areas_for_improvement: ''
  });
  const [sessionId] = useState(() => generateSessionId());
  const [formState, setFormState] = useState<FeedbackFormState>({
    step: 'editing',
    aiAnalysisAttempted: false
  });

  const { submitFeedback, isSubmitting } = useFeedbackSubmission();

  // Load saved form data from localStorage
  useEffect(() => {
    if (uniqueLink) {
      const savedData = localStorage.getItem(`feedback_draft_${uniqueLink}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData(parsedData);
          toast({
            title: "Draft Restored",
            description: "Your previous progress has been restored.",
          });
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      }
    }
  }, [uniqueLink]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (uniqueLink && (formData.strengths || formData.areas_for_improvement)) {
      localStorage.setItem(`feedback_draft_${uniqueLink}`, JSON.stringify(formData));
    }
  }, [formData, uniqueLink]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
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
  }, [uniqueLink]);

  async function fetchFeedbackRequest() {
    if (!uniqueLink) {
      throw new Error('No feedback link provided');
    }

    // First, get the feedback request
    const { data: requestData, error: requestError } = await supabase
      .from('feedback_requests')
      .select(`
        id,
        review_cycle_id,
        employee_id,
        status,
        unique_link,
        feedback:feedback_responses (
          id,
          submitted_at,
          is_draft,
          session_id,
          strengths,
          areas_for_improvement,
          relationship
        )
      `)
      .eq('unique_link', uniqueLink)
      .single();

    if (requestError) {
      console.error('Error fetching feedback request:', requestError);
      throw requestError;
    }

    if (!requestData) {
      console.error('No feedback request found for link:', uniqueLink);
      throw new Error('No feedback request found');
    }

    // Check for existing draft
    if (requestData.feedback) {
      const existingDraft = requestData.feedback.find(
        (f: any) => f.is_draft && f.session_id === sessionId
      );

      if (existingDraft) {
        console.log('Found existing draft:', existingDraft);
        setFormState(prev => ({
          ...prev,
          draftId: existingDraft.id,
          aiAnalysisAttempted: true
        }));
        setFormData({
          relationship: existingDraft.relationship || 'equal_colleague',
          strengths: existingDraft.strengths || '',
          areas_for_improvement: existingDraft.areas_for_improvement || ''
        });
      }
    }

    // Get the employee data
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', requestData.employee_id)
      .single();

    if (employeeError) throw employeeError;
    if (!employeeData) throw new Error('Employee not found');

    // Get the review cycle data
    const { data: cycleData, error: cycleError } = await supabase
      .from('review_cycles')
      .select('*')
      .eq('id', requestData.review_cycle_id)
      .single();

    if (cycleError) throw cycleError;
    if (!cycleData) throw new Error('Review cycle not found');

    // Combine the data
    const combinedData = {
      ...requestData,
      employee: employeeData,
      review_cycle: cycleData
    };

    setFeedbackRequest(combinedData);
  }

  async function saveFeedbackResponse(isDraft: boolean = true): Promise<string | null> {
    if (!feedbackRequest || !uniqueLink) return null;

    try {
      // First check if we already have a draft for this session
      if (!formState.draftId) {
        const { data: existingDrafts, error: searchError } = await supabase
          .from('feedback_responses')
          .select('id')
          .eq('feedback_request_id', feedbackRequest.id)
          .eq('session_id', sessionId)
          .eq('is_draft', true);

        if (!searchError && existingDrafts && existingDrafts.length > 0) {
          console.log('Found existing draft:', existingDrafts[0]);
          setFormState(prev => ({
            ...prev,
            draftId: existingDrafts[0].id
          }));
          return existingDrafts[0].id;
        }
      }

      const currentTime = new Date().toISOString();
      const feedbackData = {
        feedback_request_id: feedbackRequest.id,
        session_id: sessionId,
        relationship: formData.relationship,
        strengths: formData.strengths,
        areas_for_improvement: formData.areas_for_improvement,
        is_draft: isDraft,
        submitted_at: currentTime
      };

      // If we have a draft ID, update it
      if (formState.draftId) {
        const { error: updateError } = await supabase
          .from('feedback_responses')
          .update(feedbackData)
          .eq('id', formState.draftId)
          .eq('session_id', sessionId)
          .eq('is_draft', true);

        if (updateError) {
          console.error('Error updating feedback:', updateError);
          throw updateError;
        }
        return formState.draftId;
      }

      // Otherwise create a new draft
      const { data, error: insertError } = await supabase
        .from('feedback_responses')
        .insert([feedbackData])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting feedback:', insertError);
        throw insertError;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }
    if (!feedbackRequest || !uniqueLink) return;

    // If we're in the editing state and haven't done AI analysis yet
    if (formState.step === 'editing' && !formState.aiAnalysisAttempted) {
      try {
        const draftId = await saveFeedbackResponse(true);
        if (draftId) {
          setFormState(prev => ({
            ...prev,
            step: 'ai_review',
            aiAnalysisAttempted: true,
            draftId
          }));
        }
      } catch (error) {
        console.error('Error saving draft:', error);
        toast({
          title: "Error",
          description: "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // If we're in AI review or have already done AI analysis, proceed to submission
    setFormState(prev => ({ ...prev, step: 'submitting' }));
    
    const success = await submitFeedback(formData, {
      feedbackRequestId: feedbackRequest.id,
      uniqueLink,
      sessionId,
      draftId: formState.draftId
    });

    if (!success) {
      setFormState(prev => ({ ...prev, step: 'ai_review' }));
    }
  }

  function handleRevise() {
    setFormState(prev => ({ ...prev, step: 'editing' }));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!feedbackRequest) return null;

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
          className="absolute right-0 top-0 p-2 text-muted-foreground hover:text-foreground"
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
          onRevise={handleRevise}
          isLoading={isSubmitting}
          onFeedbackChange={async (field, value) => {
            setFormData(prev => ({
              ...prev,
              [field]: value
            }));
            
            if (formState.draftId) {
              try {
                const { error: updateError } = await supabase
                  .from('feedback_responses')
                  .update({
                    [field]: value,
                    submitted_at: new Date().toISOString()
                  })
                  .eq('id', formState.draftId)
                  .eq('session_id', sessionId)
                  .eq('is_draft', true);

                if (updateError) throw updateError;
              } catch (error) {
                console.error('Error saving changes:', error);
                setFormData(prev => ({
                  ...prev,
                  [field]: prev[field]
                }));
                toast({
                  title: "Error",
                  description: "Failed to save changes. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }}
        />
      ) : (
        <FeedbackForm
          employeeName={feedbackRequest.employee.name}
          employeeRole={feedbackRequest.employee.role}
          showNames={showNames}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 