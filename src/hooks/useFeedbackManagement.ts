import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { FeedbackRequest } from '@/types/reviews/employee-review';

interface UseFeedbackManagementProps {
  feedbackRequest: FeedbackRequest | null;
  onFeedbackUpdate: (updatedFeedback: FeedbackRequest) => void;
}

export function useFeedbackManagement({ feedbackRequest, onFeedbackUpdate }: UseFeedbackManagementProps) {
  const { toast } = useToast();
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!feedbackRequest) return;
    
    setDeletingFeedbackId(feedbackId);
    
    try {
      // First, update any feedback responses that reference this one
      const { error: updateError } = await supabase
        .from('feedback_responses')
        .update({ previous_version_id: null })
        .eq('previous_version_id', feedbackId);

      if (updateError) {
        console.error('Error updating references:', updateError);
      }

      // Then delete the feedback
      const { error } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      // Update local state
      if (feedbackRequest) {
        const updatedFeedback = feedbackRequest.feedback?.filter((f: { id: string }) => f.id !== feedbackId) || [];
        const updatedRequest = {
          ...feedbackRequest,
          feedback: updatedFeedback,
          _count: {
            responses: updatedFeedback.length,
            page_views: 0,
            unique_viewers: 0
          }
        };
        onFeedbackUpdate(updatedRequest);
      }

      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const handleDeleteClick = useCallback((feedbackId: string) => {
    setFeedbackToDelete(feedbackId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (feedbackToDelete) {
      await handleDeleteFeedback(feedbackToDelete);
      setIsDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    }
  }, [feedbackToDelete]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setFeedbackToDelete(null);
  }, []);

  return {
    deletingFeedbackId,
    isDeleteDialogOpen,
    feedbackToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    setIsDeleteDialogOpen
  };
} 