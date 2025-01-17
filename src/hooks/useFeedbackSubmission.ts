import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, anonymousClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { FeedbackFormData } from '@/types/feedback/form';
import { SubmissionOptions } from '@/types/feedback/submission';
import { CoreFeedbackResponse } from '@/types/feedback/base';

export function useFeedbackSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const submitFeedback = async (
    formData: FeedbackFormData,
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

      let existingDraft = null;
      
      // Only check for existing draft if draftId is provided
      if (draftId) {
        const { data: draft, error: fetchError } = await anonymousClient
          .from('feedback_responses')
          .select()
          .eq('id', draftId)
          .eq('status', 'in_progress')
          .maybeSingle();

        console.log('Existing draft check:', { draft, fetchError });

        if (fetchError) {
          console.error('Error checking existing draft:', fetchError);
          // Don't throw here, just log the error and continue
        } else {
          existingDraft = draft;
        }
      }

      let result: CoreFeedbackResponse;

      if (existingDraft) {
        // Update existing feedback to submitted in two steps
        console.log('Converting in-progress feedback to submission:', existingDraft.id);
        
        // Step 1: Update the content while keeping status as in_progress
        const { error: contentUpdateError } = await anonymousClient
          .from('feedback_responses')
          .update({
            strengths: formData.strengths.trim(),
            areas_for_improvement: formData.areas_for_improvement.trim(),
            relationship: formData.relationship,
            created_at: currentTime
          })
          .eq('id', existingDraft.id)
          .eq('status', 'in_progress');

        if (contentUpdateError) {
          console.error('Error updating feedback content:', contentUpdateError);
          throw new Error('Failed to update feedback content');
        }

        // Step 2: Update the status to submitted
        const { data: updated, error: statusUpdateError } = await anonymousClient
          .from('feedback_responses')
          .update({
            status: 'submitted',
            submitted_at: currentTime,
            created_at: currentTime
          })
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (statusUpdateError) {
          console.error('Error updating feedback status:', statusUpdateError);
          throw new Error('Failed to submit feedback');
        }

        result = updated;
        console.log('=== Feedback Submitted ===');
      } else {
        // Create new feedback
        console.log('Creating new feedback submission');
        const { data: newSubmission, error: insertError } = await anonymousClient
          .from('feedback_responses')
          .insert([{
            feedback_request_id: feedbackRequestId,
            session_id: sessionId,
            strengths: formData.strengths.trim(),
            areas_for_improvement: formData.areas_for_improvement.trim(),
            relationship: formData.relationship,
            status: 'submitted',
            submitted_at: currentTime,
            created_at: currentTime
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating feedback:', insertError);
          throw new Error('Failed to submit feedback');
        }

        result = newSubmission;
        console.log('=== New Feedback Created ===');
      }

      console.log('Final result:', result);

      // Store submission in localStorage and clean up
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