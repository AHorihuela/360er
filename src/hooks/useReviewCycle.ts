import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ReviewCycle, FeedbackRequest, REQUEST_STATUS } from '@/types/review'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'

export function useReviewCycle(cycleId: string | undefined) {
  const { toast } = useToast()
  const { isMasterAccount, user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null)
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([])
  const [cycleOwnerUserId, setCycleOwnerUserId] = useState<string | null>(null)
  const [isMasterMode, setIsMasterMode] = useState(false)
  
  // Check if we're in master mode (viewing another user's cycle)
  useEffect(() => {
    if (isMasterAccount && cycleOwnerUserId && user?.id && user.id !== cycleOwnerUserId) {
      setIsMasterMode(true);
    } else {
      setIsMasterMode(false);
    }
  }, [isMasterAccount, cycleOwnerUserId, user?.id]);

  const fetchData = useCallback(async () => {
    // Don't try to fetch data if cycleId is missing or "new"
    if (!cycleId || cycleId === 'new') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true)

      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select(`
          *,
          feedback_requests (
            id,
            employee_id,
            status,
            target_responses,
            unique_link,
            employee:employees (
              id,
              name,
              role,
              user_id
            ),
            feedback_responses (
              id,
              submitted_at,
              relationship
            ),
            analytics:feedback_analytics!feedback_request_id (
              id,
              insights
            )
          )
        `)
        .eq('id', cycleId)
        .maybeSingle()

      if (cycleError) throw cycleError
      if (!cycleData) {
        toast({
          title: "Error",
          description: "Review cycle not found",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Store the cycle owner's user ID
      setCycleOwnerUserId(cycleData.user_id)

      // Process feedback requests
      const processedRequests = cycleData.feedback_requests.map((request: any) => {
        console.log('Processing request:', request)
        const responseCount = request.feedback_responses?.length || 0
        
        // Determine status based on responses and due date
        let status = request.status
        if (responseCount > request.target_responses) {
          status = REQUEST_STATUS.EXCEEDED
        } else if (responseCount === request.target_responses) {
          status = REQUEST_STATUS.COMPLETED
        } else if (responseCount > 0) {
          status = REQUEST_STATUS.IN_PROGRESS
        } else {
          status = REQUEST_STATUS.PENDING
        }

        // Ensure employee data is properly structured
        const employee = Array.isArray(request.employee) ? request.employee[0] : request.employee
        
        return {
          ...request,
          status,
          employee,
          _count: {
            responses: responseCount
          }
        }
      }) as FeedbackRequest[]

      setReviewCycle(cycleData)
      setFeedbackRequests(processedRequests)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load review cycle details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [cycleId, toast])

  const updateTitle = async (newTitle: string): Promise<void> => {
    // Don't try to update if cycleId is missing or "new"
    if (!cycleId || cycleId === 'new') {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('review_cycles')
        .update({ title: newTitle })
        .eq('id', cycleId)

      if (error) throw error
      setReviewCycle(prev => prev ? { ...prev, title: newTitle } : null)
    } catch (error) {
      console.error('Error updating title:', error)
      toast({
        title: "Error",
        description: "Failed to update review cycle title",
        variant: "destructive",
      })
      throw error
    }
  }

  const removeEmployee = async (requestId: string) => {
    // Don't try to update if cycleId is missing or "new"
    if (!cycleId || cycleId === 'new') {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      setFeedbackRequests(prev => prev.filter(req => req.id !== requestId))
      return true
    } catch (error) {
      console.error('Error removing employee:', error)
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    isLoading,
    reviewCycle,
    feedbackRequests,
    updateTitle,
    removeEmployee,
    setFeedbackRequests,
    isMasterMode,
    cycleOwnerUserId
  }
} 
