import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  ManagerFeedbackEntry, 
  CreateManagerFeedbackInput, 
  FeedbackResponse 
} from '@/types/review';

interface UseManagerFeedbackProps {
  userId?: string;
  reviewCycleId?: string; // Now required for feedback operations
}

export function useManagerFeedback({ userId, reviewCycleId }: UseManagerFeedbackProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a manager feedback entry within a specific review cycle
  const submitManagerFeedback = useCallback(async (
    input: CreateManagerFeedbackInput
  ): Promise<ManagerFeedbackEntry | null> => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User authentication required",
        variant: "destructive",
      });
      return null;
    }

    if (!reviewCycleId) {
      toast({
        title: "Error",
        description: "Review cycle required. Please select or create a Manager-to-Employee feedback cycle.",
        variant: "destructive",
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      // Verify the review cycle exists and belongs to the user
      const { data: reviewCycle, error: cycleError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', reviewCycleId)
        .eq('user_id', userId)
        .eq('type', 'manager_to_employee')
        .single();

      if (cycleError || !reviewCycle) {
        console.error('Error fetching review cycle:', cycleError);
        throw new Error('Invalid review cycle or insufficient permissions');
      }

      // Get or create feedback request for this employee in this cycle
      const { data: feedbackRequest, error: requestError } = await supabase
        .from('feedback_requests')
        .select('*')
        .eq('review_cycle_id', reviewCycleId)
        .eq('employee_id', input.employee_id)
        .maybeSingle();

      if (requestError) {
        console.error('Error fetching feedback request:', requestError);
        throw requestError;
      }

      let activeFeedbackRequest = feedbackRequest;

      // Create feedback request if it doesn't exist (employee was added to cycle)
      if (!activeFeedbackRequest) {
        const { data: newRequest, error: createRequestError } = await supabase
          .from('feedback_requests')
          .insert({
            review_cycle_id: reviewCycleId,
            employee_id: input.employee_id,
            status: 'active',
            target_responses: 0, // No target for manager feedback
            unique_link: null // No anonymous link needed for manager feedback
          })
          .select()
          .single();

        if (createRequestError) {
          console.error('Error creating feedback request:', createRequestError);
          throw createRequestError;
        }
        activeFeedbackRequest = newRequest;
      }

      // Submit the feedback response
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_request_id: activeFeedbackRequest.id,
          relationship: 'manager',
          strengths: '', // Always empty for manager feedback - no auto-categorization
          areas_for_improvement: input.content, // Store all manager feedback here
          source: input.source || 'web',
          category: input.category,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (feedbackError) {
        console.error('Error submitting feedback:', feedbackError);
        throw feedbackError;
      }

      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });

      return {
        id: feedback.id,
        feedback_request_id: feedback.feedback_request_id,
        relationship: 'manager',
        strengths: feedback.strengths,
        areas_for_improvement: feedback.areas_for_improvement,
        source: feedback.source,
        category: feedback.category,
        submitted_at: feedback.submitted_at,
        created_at: feedback.created_at
      };

    } catch (error: any) {
      console.error('Error submitting manager feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, reviewCycleId, toast]);

  // Get manager feedback entries for an employee within the current cycle
  const getManagerFeedback = useCallback(async (
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FeedbackResponse[]> => {
    if (!userId || !reviewCycleId) return [];

    setIsLoading(true);
    try {
      let query = supabase
        .from('feedback_responses')
        .select(`
          *,
          feedback_requests!inner (
            employee_id,
            review_cycle_id
          )
        `)
        .eq('feedback_requests.review_cycle_id', reviewCycleId)
        .eq('feedback_requests.employee_id', employeeId)
        .eq('relationship', 'manager')
        .order('submitted_at', { ascending: false });

      if (startDate) {
        query = query.gte('submitted_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('submitted_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching manager feedback:', error);
        throw error;
      }

      return data || [];

    } catch (error: any) {
      console.error('Error fetching manager feedback:', error);
      toast({
        title: "Error",
        description: "Failed to fetch feedback",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId, reviewCycleId, toast]);

  // Get all feedback within the current cycle (for analytics)
  const getCycleFeedback = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<FeedbackResponse[]> => {
    if (!userId || !reviewCycleId) return [];

    setIsLoading(true);
    try {
      let query = supabase
        .from('feedback_responses')
        .select(`
          *,
          feedback_requests!inner (
            review_cycle_id,
            employee_id
          )
        `)
        .eq('feedback_requests.review_cycle_id', reviewCycleId)
        .eq('relationship', 'manager')
        .order('submitted_at', { ascending: false });

      if (startDate) {
        query = query.gte('submitted_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('submitted_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycle feedback:', error);
        throw error;
      }

      return data || [];

    } catch (error: any) {
      console.error('Error fetching cycle feedback:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId, reviewCycleId]);

  // Delete a feedback entry
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        console.error('Error deleting feedback:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });

      return true;

    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, toast]);

  // Update feedback entry
  const updateFeedback = useCallback(async (
    feedbackId: string,
    updates: Partial<Pick<FeedbackResponse, 'strengths' | 'areas_for_improvement' | 'category'>>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('feedback_responses')
        .update(updates)
        .eq('id', feedbackId);

      if (error) {
        console.error('Error updating feedback:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });

      return true;

    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, toast]);

  return {
    submitManagerFeedback,
    getManagerFeedback,
    getCycleFeedback,
    deleteFeedback,
    updateFeedback,
    isLoading,
    isSubmitting
  };
} 