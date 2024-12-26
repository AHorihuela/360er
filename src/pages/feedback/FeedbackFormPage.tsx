import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateFeedback } from '@/utils/feedbackValidation';

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

interface ValidationState {
  strengths: {
    isValid: boolean;
    message: string;
    warnings?: string[];
    showLengthWarning: boolean;
  };
  areas_for_improvement: {
    isValid: boolean;
    message: string;
    warnings?: string[];
    showLengthWarning: boolean;
  };
}

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function FeedbackFormPage() {
  const { toast } = useToast();
  const { uniqueLink } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [formData, setFormData] = useState<FeedbackFormData>({
    relationship: 'equal_colleague',
    strengths: '',
    areas_for_improvement: ''
  });
  const [sessionId] = useState(() => generateSessionId());
  const [validation, setValidation] = useState<ValidationState>({
    strengths: { isValid: true, message: '', showLengthWarning: false },
    areas_for_improvement: { isValid: true, message: '', showLengthWarning: false }
  });
  const [showLengthRequirements, setShowLengthRequirements] = useState(false);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const trackPageView = async () => {
      if (!feedbackRequest) return;

      try {
        const { error } = await supabase
          .from('page_views')
          .insert([{
            feedback_request_id: feedbackRequest.id,
            session_id: sessionId,
            page_url: window.location.href
          }]);

        if (error) {
          console.error('Error tracking page view:', error);
        }
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Track initial page view
    trackPageView();

    // Update page view every minute to show active session
    interval = setInterval(trackPageView, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [feedbackRequest, sessionId]);

  // Update validation effect
  useEffect(() => {
    setValidation({
      strengths: validateFeedback(formData.strengths, showLengthRequirements),
      areas_for_improvement: validateFeedback(formData.areas_for_improvement, showLengthRequirements)
    });
  }, [formData.strengths, formData.areas_for_improvement, showLengthRequirements]);

  async function fetchFeedbackRequest() {
    try {
      console.log('Starting fetchFeedbackRequest for link:', uniqueLink);
      
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
            submitted_at
          )
        `)
        .eq('unique_link', uniqueLink)
        .maybeSingle();

      if (requestError) {
        console.error('Error fetching feedback request:', requestError);
        throw requestError;
      }

      if (!requestData) {
        console.error('No feedback request found for link:', uniqueLink);
        throw new Error('No feedback request found');
      }

      // Check if this browser has already submitted feedback
      try {
        const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
        if (uniqueLink && submittedFeedbacks[uniqueLink]) {
          console.log('Previous submission found in localStorage');
          navigate('/feedback/thank-you');
          return;
        }
      } catch (e) {
        console.log('No localStorage submission found');
      }

      // Then get the employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', requestData.employee_id)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employeeData) throw new Error('Employee not found');

      // Then get the review cycle data
      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', requestData.review_cycle_id)
        .maybeSingle();

      if (cycleError) throw cycleError;
      if (!cycleData) throw new Error('Review cycle not found');

      // Check if the review cycle is past its review_by_date
      if (cycleData.review_by_date) {
        const reviewByDate = new Date(cycleData.review_by_date);
        if (reviewByDate < new Date()) {
          throw new Error('This review cycle has ended');
        }
      }

      // Combine the data
      const combinedData = {
        ...requestData,
        employee: employeeData,
        review_cycle: cycleData
      };

      setFeedbackRequest(combinedData);
    } catch (error) {
      console.error('Error in fetchFeedbackRequest:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid or expired feedback link",
        variant: "destructive",
      });
      navigate('/');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackRequest || !uniqueLink) return;

    // Show length requirements if not already showing
    if (!showLengthRequirements) {
      setShowLengthRequirements(true);
      // Revalidate with length requirements
      const strengthsValidation = validateFeedback(formData.strengths, true);
      const improvementValidation = validateFeedback(formData.areas_for_improvement, true);
      
      // If either field is invalid, prevent submission
      if (!strengthsValidation.isValid || !improvementValidation.isValid) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
        console.log('Starting feedback submission...', {
            feedback_request_id: feedbackRequest.id,
            relationship: formData.relationship,
            strengths: formData.strengths?.length,
            areas_for_improvement: formData.areas_for_improvement?.length,
            request_status: feedbackRequest.status,
            unique_link: uniqueLink
        });

        const { data, error: responseError } = await supabase
            .from('feedback_responses')
            .insert({
                feedback_request_id: feedbackRequest.id,
                relationship: formData.relationship,
                strengths: formData.strengths,
                areas_for_improvement: formData.areas_for_improvement
            })
            .select('*')
            .single();

        if (responseError) {
            console.error('Error submitting feedback:', {
                code: responseError.code,
                message: responseError.message,
                details: responseError.details,
                hint: responseError.hint
            });
            throw responseError;
        }

        console.log('Feedback submitted successfully:', data);

        // Store submission in localStorage
        const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
        submittedFeedbacks[uniqueLink] = {
            submittedAt: new Date().toISOString(),
            employeeName: feedbackRequest.employee.name
        };
        localStorage.setItem('submittedFeedbacks', JSON.stringify(submittedFeedbacks));

        // Clear the draft after successful submission
        localStorage.removeItem(`feedback_draft_${uniqueLink}`);

        toast({
            title: "Success",
            description: "Thank you for your feedback!",
        });
        navigate('/feedback/thank-you');
    } catch (error) {
        console.error('Error submitting feedback:', error);
        console.error('Feedback request details:', {
            id: feedbackRequest.id,
            status: feedbackRequest.status,
            review_cycle: {
                id: feedbackRequest.review_cycle_id,
                review_by_date: feedbackRequest.review_cycle.review_by_date
            }
        });
        toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!feedbackRequest) return null;

  if (feedbackRequest.status === 'completed') {
    return (
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Feedback Form Closed</h1>
          <p className="mt-4 text-muted-foreground">
            This feedback request has been completed and is no longer accepting submissions.
          </p>
        </div>
      </div>
    );
  }

  const displayName = showNames ? feedbackRequest.employee.name : 'Employee';

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="relative text-center">
        <button
          onClick={() => setShowNames(!showNames)}
          className="absolute right-0 top-0 p-2 text-muted-foreground hover:text-foreground"
          type="button"
          title={showNames ? "Hide names" : "Show names"}
        >
          {showNames ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        <h1 className="text-3xl font-bold">Feedback Form for {displayName}</h1>
        <p className="mt-2 text-muted-foreground">
          Providing feedback for {displayName} - {feedbackRequest.employee.role}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Review cycle: {feedbackRequest.review_cycle.title}
        </p>
        {(formData.strengths || formData.areas_for_improvement) && (
          <p className="mt-2 text-sm text-muted-foreground">
            Draft saved automatically
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Your Relationship to {displayName}
          </label>
          <Select
            value={formData.relationship}
            onValueChange={(value: FeedbackFormData['relationship']) => 
              setFormData({ ...formData, relationship: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your relationship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="senior_colleague">
                Senior Colleague (I am more senior than {feedbackRequest.employee.role})
              </SelectItem>
              <SelectItem value="equal_colleague">
                Equal Colleague (I am {feedbackRequest.employee.role} or equivalent)
              </SelectItem>
              <SelectItem value="junior_colleague">
                Junior Colleague (I am less senior than {feedbackRequest.employee.role})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Strengths</label>
          <div className="space-y-1">
            <textarea
              className={`min-h-[120px] w-full rounded-md border ${
                !validation.strengths.isValid && validation.strengths.showLengthWarning
                  ? 'border-red-500'
                  : validation.strengths.isValid && formData.strengths.length > 0
                  ? validation.strengths.warnings?.length ? 'border-yellow-500' : 'border-green-500'
                  : 'border-input'
              } bg-background px-3 py-2`}
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              placeholder={`What does ${displayName} do well? What are their key strengths?`}
              required
            />
            <div className="space-y-1">
              {validation.strengths.showLengthWarning && (
                <p className={`text-sm ${
                  !validation.strengths.isValid ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {validation.strengths.message}
                </p>
              )}
              {validation.strengths.warnings?.map((warning, index) => (
                <p key={index} className="text-sm text-yellow-500">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Areas for Improvement</label>
          <div className="space-y-1">
            <textarea
              className={`min-h-[120px] w-full rounded-md border ${
                !validation.areas_for_improvement.isValid && validation.areas_for_improvement.showLengthWarning
                  ? 'border-red-500'
                  : validation.areas_for_improvement.isValid && formData.areas_for_improvement.length > 0
                  ? validation.areas_for_improvement.warnings?.length ? 'border-yellow-500' : 'border-green-500'
                  : 'border-input'
              } bg-background px-3 py-2`}
              value={formData.areas_for_improvement}
              onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
              placeholder={`What could ${displayName} improve? What suggestions do you have for their development?`}
              required
            />
            <div className="space-y-1">
              {validation.areas_for_improvement.showLengthWarning && (
                <p className={`text-sm ${
                  !validation.areas_for_improvement.isValid ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {validation.areas_for_improvement.message}
                </p>
              )}
              {validation.areas_for_improvement.warnings?.map((warning, index) => (
                <p key={index} className="text-sm text-yellow-500">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={
              isSubmitting || 
              (showLengthRequirements && (!validation.strengths.isValid || !validation.areas_for_improvement.isValid))
            }
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
} 