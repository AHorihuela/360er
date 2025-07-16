import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { type ReviewCycleWithUser } from '@/types/review';

/**
 * Custom hook for managing review cycles data
 * @param userId - Current user ID
 * @param isMasterAccount - Whether the user has master account privileges
 * @param viewingAllAccounts - Whether viewing all accounts in master mode
 */
export function useReviewCyclesData(userId: string | undefined, isMasterAccount: boolean, viewingAllAccounts: boolean) {
  const { toast } = useToast();
  const [allReviewCycles, setAllReviewCycles] = useState<ReviewCycleWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReviewCyclesData = async (): Promise<ReviewCycleWithUser[]> => {
    if (!userId) return [];

    try {
      setIsLoading(true);
      
      const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
      
      let cyclesQuery;
      
      if (!shouldFilterByUser) {
        // Master account mode - fetch cycles without user join first
        console.log('[CYCLES] Fetching in master mode - showing all accounts');
        cyclesQuery = supabase
          .from('review_cycles')
          .select(`
            *,
            feedback_requests (
              id,
              employee_id,
              target_responses,
              feedback_responses (
                id,
                relationship,
                strengths,
                areas_for_improvement,
                submitted_at,
                status,
                responses
              ),
              analytics:feedback_analytics (
                id,
                insights
              )
            )
          `)
          .order('created_at', { ascending: false });
      } else {
        // Regular user mode - no user email needed
        cyclesQuery = supabase
          .from('review_cycles')
          .select(`
            *,
            feedback_requests (
              id,
              employee_id,
              target_responses,
              feedback_responses (
                id,
                relationship,
                strengths,
                areas_for_improvement,
                submitted_at,
                status,
                responses
              ),
              analytics:feedback_analytics (
                id,
                insights
              )
            )
          `)
          .order('created_at', { ascending: false })
          .eq('user_id', userId);
      }
      
      const { data: reviewCycles, error } = await cyclesQuery;

      if (error) {
        console.error('[CYCLES] Error fetching review cycles:', error);
        toast({
          title: 'Error fetching review cycles',
          description: error.message,
          variant: 'destructive',
        });
        return [];
      }

      if (!reviewCycles) return [];

      // Transform and process the cycles data
      let cyclesWithUsers = reviewCycles.map(cycle => ({
        ...cycle,
        userEmail: null // Will be populated below for master mode
      }));

      // If in master account mode, fetch user emails for cycles not owned by current user
      if (!shouldFilterByUser && reviewCycles.length > 0) {
        const otherUserIds = [...new Set(
          reviewCycles
            .filter(cycle => cycle.user_id !== userId)
            .map(cycle => cycle.user_id)
        )];

        if (otherUserIds.length > 0) {
          const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
          
          if (usersError) {
            console.error('[CYCLES] Error fetching user emails for master mode:', usersError);
          } else if (users?.users) {
            const userEmailMap = users.users.reduce((acc, authUser) => {
              if (authUser.id && authUser.email) {
                acc[authUser.id] = authUser.email;
              }
              return acc;
            }, {} as Record<string, string>);

            // Update cycles with user emails
            cyclesWithUsers = reviewCycles.map(cycle => ({
              ...cycle,
              userEmail: cycle.user_id !== userId ? userEmailMap[cycle.user_id] || null : null
            }));
          }
        }
      }

      setAllReviewCycles(cyclesWithUsers);
      return cyclesWithUsers;
    } catch (error) {
      console.error('[CYCLES] Critical error in fetchReviewCyclesData:', error);
      toast({
        title: 'Error loading review cycles',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    allReviewCycles,
    isLoading,
    fetchReviewCyclesData
  };
} 