import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface FeedbackData {
  strengths: string;
  areas_for_improvement: string;
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
}

interface SubmissionOptions {
  feedbackRequestId: string;
  uniqueLink: string;
  sessionId: string;
  draftId?: string;
}

export function useFeedbackSubmission() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (
    formData: FeedbackData,
    options: SubmissionOptions
  ) => {
    const { feedbackRequestId, uniqueLink, sessionId, draftId } = options;

    if (!feedbackRequestId || !uniqueLink) {
      console.error('Missing required data for submission');
      toast({
        title: "Error",
        description: "Missing required data for submission. Please try again.",
        variant: "destructive",
      });
      return false;
    }
    
    setIsSubmitting(true);
    console.log('=== Starting Feedback Submission Process ===');
    console.log('Draft ID:', draftId);
    console.log('Session ID:', sessionId);
    
    try {
      const currentTime = new Date().toISOString();
      
      if (draftId) {
        console.log('=== Starting Feedback Submission Process ===');
        console.log('Draft ID:', draftId);
        console.log('Session ID:', sessionId);
        console.log('Form Data:', formData);

        // First verify the draft exists and is still a draft
        const { data: currentDraft, error: fetchError } = await supabase
          .from('feedback_responses')
          .select('*')
          .eq('id', draftId)
          .eq('session_id', sessionId)
          .eq('is_draft', true)
          .maybeSingle();

        console.log('Current draft fetch result:', { currentDraft, fetchError });

        if (fetchError) {
          console.error('Error fetching draft:', fetchError);
          throw new Error('Could not access draft. Please try again.');
        }

        if (!currentDraft) {
          console.log('No draft found, proceeding with direct submission');
          // Handle as a new submission
          const submissionData = {
            feedback_request_id: feedbackRequestId,
            session_id: sessionId,
            relationship: formData.relationship,
            strengths: formData.strengths.trim(),
            areas_for_improvement: formData.areas_for_improvement.trim(),
            is_draft: false,
            status: 'submitted',
            submitted_at: currentTime
          };

          const { data: newSubmission, error: insertError } = await supabase
            .from('feedback_responses')
            .insert([submissionData])
            .select()
            .single();

          if (insertError || !newSubmission) {
            console.error('Error inserting feedback:', insertError);
            throw new Error('Failed to submit feedback');
          }

          // Store submission in localStorage
          const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
          submittedFeedbacks[uniqueLink] = true;
          localStorage.setItem('submittedFeedbacks', JSON.stringify(submittedFeedbacks));
          
          // Clear any draft and analysis cache
          localStorage.removeItem(`feedback_draft_${uniqueLink}`);
          localStorage.removeItem('last_feedback_analysis');

          toast({
            title: "Success",
            description: "Thank you for your feedback!",
          });

          navigate('/feedback/thank-you');
          return true;
        }

        if (currentDraft.status === 'submitted') {
          console.error('Draft is already submitted');
          throw new Error('This feedback has already been submitted.');
        }

        // Log the current state of the draft
        console.log('Current draft state:', {
          id: currentDraft.id,
          is_draft: currentDraft.is_draft,
          status: currentDraft.status,
          session_id: currentDraft.session_id
        });

        // Prepare update data
        const updateData = {
          strengths: formData.strengths.trim(),
          areas_for_improvement: formData.areas_for_improvement.trim(),
          relationship: formData.relationship,
          is_draft: false,
          status: 'submitted',
          submitted_at: currentTime
        };

        console.log('Attempting to update draft with data:', updateData);

        // Update the draft - only use id for the condition
        const { data: updated, error: updateError } = await supabase
          .from('feedback_responses')
          .update(updateData)
          .eq('id', draftId)
          .eq('session_id', sessionId)
          .eq('is_draft', true)
          .select()
          .single();

        console.log('Update result:', { updated, updateError });

        if (updateError) {
          console.error('Error updating feedback:', updateError);
          throw new Error(`Failed to update feedback: ${updateError.message}`);
        }

        if (!updated) {
          console.error('No draft was updated');
          throw new Error('Failed to verify feedback update - no rows were modified');
        }

        console.log('=== Submission Complete ===');
        console.log('Final state:', updated);

        // Store submission in localStorage
        const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
        submittedFeedbacks[uniqueLink] = true;
        localStorage.setItem('submittedFeedbacks', JSON.stringify(submittedFeedbacks));
        
        // Clear draft and analysis cache
        localStorage.removeItem(`feedback_draft_${uniqueLink}`);
        localStorage.removeItem('last_feedback_analysis');

        toast({
          title: "Success",
          description: "Thank you for your feedback!",
        });

        navigate('/feedback/thank-you');
        return true;
      } else {
        // Handle direct submission without draft
        console.log('=== Attempting direct submission ===');
        const submissionData = {
          feedback_request_id: feedbackRequestId,
          session_id: sessionId,
          relationship: formData.relationship,
          strengths: formData.strengths.trim(),
          areas_for_improvement: formData.areas_for_improvement.trim(),
          is_draft: false,
          status: 'submitted',
          submitted_at: currentTime
        };

        console.log('Submitting data:', submissionData);

        const { data: newSubmission, error: insertError } = await supabase
          .from('feedback_responses')
          .insert([submissionData])
          .select()
          .single();

        console.log('Insert result:', { newSubmission, insertError });

        if (insertError || !newSubmission) {
          console.error('Error inserting feedback:', insertError);
          throw new Error('Failed to submit feedback');
        }

        // Store submission in localStorage
        const submittedFeedbacks = JSON.parse(localStorage.getItem('submittedFeedbacks') || '{}');
        submittedFeedbacks[uniqueLink] = true;
        localStorage.setItem('submittedFeedbacks', JSON.stringify(submittedFeedbacks));
        
        // Clear any draft and analysis cache
        localStorage.removeItem(`feedback_draft_${uniqueLink}`);
        localStorage.removeItem('last_feedback_analysis');

        toast({
          title: "Success",
          description: "Thank you for your feedback!",
        });

        navigate('/feedback/thank-you');
        return true;
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
      console.log('=== Submission Process Complete ===');
    }
  };

  return {
    submitFeedback,
    isSubmitting
  };
} 