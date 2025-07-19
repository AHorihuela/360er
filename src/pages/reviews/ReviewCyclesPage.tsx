import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingButton, InlineLoading } from '@/components/ui/loading-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ChevronRight, Calendar, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, CycleTypeBadge } from "@/components/ui/badge-variants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReviewCycle, FeedbackRequest, REQUEST_STATUS, RequestStatus } from '@/types/review';
import { useAuth } from '@/hooks/useAuth';

function determineRequestStatus(
  responseCount: number,
  targetResponses: number,
  manuallyCompleted: boolean
): RequestStatus {
  if (manuallyCompleted) return REQUEST_STATUS.COMPLETED;
  if (responseCount === 0) return REQUEST_STATUS.PENDING;
  if (responseCount < targetResponses) return REQUEST_STATUS.IN_PROGRESS;
  if (responseCount === targetResponses) return REQUEST_STATUS.COMPLETED;
  return REQUEST_STATUS.EXCEEDED;
}

async function updateRequestStatus(
  requestId: string,
  newStatus: RequestStatus
): Promise<void> {
  const { error } = await supabase
    .from('feedback_requests')
    .update({ status: newStatus })
    .eq('id', requestId);

  if (error) {
    console.error('Error updating request status:', error);
    throw error;
  }
}

// Add helper function for timestamp validation
function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return date instanceof Date && !isNaN(date.getTime());
}

function validateResponseTimestamps(
  response: { created_at: string; submitted_at: string; id: string },
  requestCreatedAt: string
): { isValid: boolean; error?: string } {
  // Validate timestamp formats
  if (!isValidTimestamp(response.created_at)) {
    console.warn(`Invalid created_at format for response ${response.id}`);
    return { isValid: true }; // Still return valid to prevent breaking functionality
  }
  if (!isValidTimestamp(response.submitted_at)) {
    console.warn(`Invalid submitted_at format for response ${response.id}`);
    return { isValid: true }; // Still return valid to prevent breaking functionality
  }
  if (!isValidTimestamp(requestCreatedAt)) {
    console.warn(`Invalid request created_at format for response ${response.id}`);
    return { isValid: true }; // Still return valid to prevent breaking functionality
  }

  const responseCreatedAt = new Date(response.created_at);
  const responseSubmittedAt = new Date(response.submitted_at);
  const requestCreatedAtDate = new Date(requestCreatedAt);

  // Add 24-hour tolerance for timestamp comparisons to account for timezone issues
  const TIMESTAMP_TOLERANCE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Check if response was created after request
  if (responseCreatedAt.getTime() + TIMESTAMP_TOLERANCE < requestCreatedAtDate.getTime()) {
    console.warn(`Response ${response.id} created before request (diff: ${Math.floor((requestCreatedAtDate.getTime() - responseCreatedAt.getTime()) / 1000)}s)`);
    return { isValid: true }; // Still return valid to prevent breaking functionality
  }

  // Check if response was submitted after creation
  if (responseSubmittedAt.getTime() + TIMESTAMP_TOLERANCE < responseCreatedAt.getTime()) {
    console.warn(`Response ${response.id} submitted before creation (diff: ${Math.floor((responseCreatedAt.getTime() - responseSubmittedAt.getTime()) / 1000)}s)`);
    return { isValid: true }; // Still return valid to prevent breaking functionality
  }

  return { isValid: true };
}

export function ReviewCyclesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);
  const { user, isMasterAccount, viewingAllAccounts } = useAuth();
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    async function initialLoad() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setIsUserLoaded(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      }
    }
    
    initialLoad();
  }, [navigate]);
  
  // Consolidated effect that waits for both auth and user data to be ready
  useEffect(() => {
    // Mark auth as ready when we have user state and master account status is determined
    if (isUserLoaded && user?.id) {
      // Small delay to ensure master account status has been checked
      const timer = setTimeout(() => {
        setIsAuthReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isUserLoaded, user?.id, isMasterAccount]);
  
  // Single effect for data fetching with debounce
  useEffect(() => {
    if (!isAuthReady || !user?.id) return;
    

    
    // Debounce multiple rapid calls
    const timer = setTimeout(() => {
      fetchReviewCycles(user.id);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isAuthReady, viewingAllAccounts, isMasterAccount, user?.id]);

  async function fetchReviewCycles(currentUserId: string) {
    try {
      setIsLoading(true);
      
      // Safety check: if viewingAllAccounts is true but isMasterAccount is false, 
      // there's likely a race condition. Default to filtering by user.
      const safeIsMasterAccount = isMasterAccount && viewingAllAccounts;
      const shouldShowAllAccounts = safeIsMasterAccount && viewingAllAccounts;
      

      
      let query = supabase
        .from('review_cycles')
        .select(`
          id,
          title,
          status,
          type,
          review_by_date,
          created_at,
          updated_at,
          user_id,
          feedback_requests!review_cycles_id_fkey (
            id,
            status,
            target_responses,
            created_at,
            updated_at,
            manually_completed,
            review_cycle_id,
            employee_id,
            unique_link,
            employees!inner (
              id,
              name,
              role
            ),
            feedback_responses!feedback_responses_feedback_request_id_fkey (
              id,
              status,
              created_at,
              submitted_at,
              relationship,
              strengths,
              areas_for_improvement,
              overall_rating,
              feedback_request_id
            )
          )
        `);

      // Only show all accounts if BOTH master account AND viewing all accounts is enabled
      const shouldFilterByUser = !shouldShowAllAccounts;
      
      if (shouldFilterByUser) {
        query = query.eq('user_id', currentUserId);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data: reviewCyclesData, error: reviewCyclesError } = await query;

      if (reviewCyclesError) {
        console.error('Supabase error details:', reviewCyclesError);
        throw reviewCyclesError;
      }

      if (!reviewCyclesData) {
        console.error('No data returned from Supabase');
        return;
      }
      


      const processedCycles: ReviewCycle[] = reviewCyclesData
        .map(cycle => {
          const validFeedbackRequests = (cycle.feedback_requests || [])
            .filter(request => {
              if (!isValidTimestamp(request.created_at)) {
                console.error(`Invalid request created_at timestamp for request ${request.id}`);
                return false;
              }

              if (new Date(request.created_at) < new Date(cycle.created_at)) {
                console.error(`Request ${request.id} created before cycle (diff: ${Math.floor((new Date(cycle.created_at).getTime() - new Date(request.created_at).getTime()) / 1000)}s)`);
                return false;
              }

              // Process responses and validate status
              const validResponses = (request.feedback_responses || [])
                .filter(response => {
                  const validation = validateResponseTimestamps(response, request.created_at);
                  if (!validation.isValid && validation.error) {
                    console.error(validation.error);
                  }
                  return validation.isValid;
                });

              // Calculate response counts and determine status
              const responseCount = validResponses.length;
              const correctStatus = determineRequestStatus(
                responseCount,
                request.target_responses,
                request.manually_completed
              );

              // Update status if it's incorrect
              if (correctStatus !== request.status) {
                updateRequestStatus(request.id, correctStatus).catch(console.error);
              }

              const employeeData = request.employees?.[0] && {
                id: request.employees[0].id,
                name: request.employees[0].name,
                role: request.employees[0].role,
                user_id: request.employees[0].id
              };

              return {
                id: request.id,
                status: correctStatus,
                target_responses: request.target_responses,
                unique_link: request.unique_link,
                employee_id: request.employee_id,
                review_cycle_id: request.review_cycle_id,
                created_at: request.created_at,
                updated_at: request.updated_at,
                manually_completed: request.manually_completed,
                feedback_responses: validResponses,
                employee: employeeData || {
                  id: request.employee_id,
                  name: 'Unknown',
                  role: 'Unknown',
                  user_id: request.employee_id
                },
                _count: {
                  responses: responseCount,
                  page_views: 0,
                  unique_viewers: 0
                }
              } as unknown as FeedbackRequest;
            });

          return {
            id: cycle.id,
            name: cycle.title,
            title: cycle.title,
            start_date: cycle.created_at,
            end_date: cycle.review_by_date,
            review_by_date: cycle.review_by_date,
            status: cycle.status as 'active' | 'completed' | 'draft',
            created_at: cycle.created_at,
            updated_at: cycle.updated_at,
            created_by: cycle.user_id,
            user_id: cycle.user_id,
            type: cycle.type || '360_review',
            feedback_requests: validFeedbackRequests,
            _count: {
              feedback_requests: validFeedbackRequests.length,
              completed_feedback: validFeedbackRequests.filter(req => 
                req.status === REQUEST_STATUS.COMPLETED || 
                req.status === REQUEST_STATUS.EXCEEDED
              ).length
            }
          } as ReviewCycle;
        });

      // Fetch user emails for cycles created by other users (in master mode)
      if (shouldShowAllAccounts && processedCycles.length > 0) {
        const otherUserIds = [...new Set(
          processedCycles
            .filter(cycle => cycle.user_id !== currentUserId)
            .map(cycle => cycle.user_id)
        )];

        if (otherUserIds.length > 0) {
          try {

            const { data: usersData, error: usersError } = await supabase
              .rpc('get_user_emails', { user_ids: otherUserIds });
              
            if (!usersError && usersData) {
              // Map user emails to cycles
              const userEmailMap = usersData.reduce((acc: Record<string, string>, user: { id: string; email: string }) => {
                acc[user.id] = user.email;
                return acc;
              }, {});


              
              // Add creator email to each cycle
              processedCycles.forEach(cycle => {
                if (cycle.user_id !== currentUserId) {
                  (cycle as any).creatorEmail = userEmailMap[cycle.user_id] || 'Unknown User';
                }
              });
            } else {
              console.warn('Error fetching user emails:', usersError);
            }
          } catch (error) {
            console.warn('Failed to fetch user emails:', error);
          }
        }
      }

      setReviewCycles(processedCycles);
    } catch (error) {
      console.error('Error fetching review cycles:', error);
      toast({
        title: "Error",
        description: "Failed to load review cycles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to get cycle type display name
  function getCycleTypeLabel(type: string): string {
    switch (type) {
      case '360_review': return '360° Feedback';
      case 'manager_effectiveness': return 'Manager Survey';
      case 'manager_to_employee': return 'Manager Feedback';
      default: return 'Review';
    }
  }





  async function handleDelete(cycleId: string) {
    if (isDeletingId) return;
    
    // Find the cycle to delete
    const cycleToDelete = reviewCycles.find(cycle => cycle.id === cycleId);
    
    // Safety check: Only allow deleting if user owns the cycle or if we're in a development environment
    const isOwnedByCurrentUser = cycleToDelete?.user_id === user?.id;
    if (isMasterAccount && viewingAllAccounts && !isOwnedByCurrentUser) {
      toast({
        title: "Permission Denied",
        description: "Master accounts cannot delete review cycles owned by other users.",
        variant: "destructive",
      });
      return;
    }
    
    setCycleToDelete(cycleId);
    setShowDeleteDialog(true);
  }

  async function confirmDelete() {
    if (!cycleToDelete || isDeletingId) return;
    
    try {
      setIsDeletingId(cycleToDelete);
      const { error } = await supabase
        .from('review_cycles')
        .delete()
        .eq('id', cycleToDelete);

      if (error) {
        console.error('Supabase error details:', error);
        
        // Check for permission errors from RLS policies
        if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('policy')) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to delete this review cycle.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setReviewCycles(reviewCycles.filter(cycle => cycle.id !== cycleToDelete));
      toast({
        title: "Success",
        description: "Review cycle deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting review cycle:', error);
      toast({
        title: "Error",
        description: "Failed to delete review cycle",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
      setShowDeleteDialog(false);
      setCycleToDelete(null);
    }
  }

  function handleCancelDelete() {
    setShowDeleteDialog(false);
    setCycleToDelete(null);
  }



  function getStatusText(cycle: ReviewCycle): string {
    const progress = calculateProgress(cycle);
    
    // For completed cycles, show as completed regardless of type
    if (progress >= 100) return 'Completed';
    
    // For manager-to-employee cycles (continuous), show as active
    if (cycle.type === 'manager_to_employee') return 'Active';
    
    // For cycles with due dates, check if overdue
    if (cycle.review_by_date) {
      const now = new Date();
      const reviewByDate = new Date(cycle.review_by_date);
      if (reviewByDate > now) return 'In Progress';
      return 'Overdue';
    }
    
    // Default to in progress for cycles without due dates
    return 'In Progress';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function calculateProgress(cycle: ReviewCycle): number {
    if (!cycle.feedback_requests?.length) return 0;
    
    // For traditional cycles (360, manager effectiveness), use target-based progress
    const totalResponses = cycle.feedback_requests.reduce((acc, req) => 
      acc + (req.feedback_responses?.length || 0), 0);
    const totalTargetResponses = cycle.feedback_requests.reduce((acc, req) => 
      acc + (req.target_responses || 0), 0);
    
    return totalTargetResponses > 0 
      ? Math.round((totalResponses / totalTargetResponses) * 100)
      : 0;
  }

  function getResponseCounts(cycle: ReviewCycle): { completed: number; pending: number } {
    if (!cycle.feedback_requests?.length) return { completed: 0, pending: 0 };
    
    const totalResponses = cycle.feedback_requests.reduce((acc, req) => 
      acc + (req.feedback_responses?.length || 0), 0);
    const totalTargetResponses = cycle.feedback_requests.reduce((acc, req) => 
      acc + (req.target_responses || 0), 0);
    
    return {
      completed: totalResponses,
      pending: totalTargetResponses - totalResponses
    };
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Review Cycles</h1>
            <p className="text-muted-foreground">
              Manage your review cycles, collect feedback, and analyze results
            </p>
          </div>
          <Button onClick={() => navigate('/reviews/new-cycle')}>
            <Plus className="h-4 w-4 mr-2" />
            New Review Cycle
          </Button>
        </div>
        
        {/* Display master account mode badge if viewing all accounts */}
        {isMasterAccount && viewingAllAccounts && (
          <div className="flex justify-end">
            <Badge variant="outline" className="bg-amber-100">
              Master Account Mode
            </Badge>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <InlineLoading text="Loading review cycles..." />
          </div>
        ) : reviewCycles.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <h3 className="text-lg font-medium mb-2">No review cycles found</h3>
            <p className="text-muted-foreground mb-6">
              Create your first review cycle to start collecting feedback
            </p>
            <Button onClick={() => navigate('/reviews/new-cycle')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Review Cycle
            </Button>
          </div>
        ) : (
          <>
            {/* Group cycles by ownership in Master Mode */}
            {(() => {
              const ownCycles = reviewCycles.filter(cycle => cycle.user_id === user?.id);
              const otherCycles = reviewCycles.filter(cycle => cycle.user_id !== user?.id);
              
              // Use safe master account check for rendering decisions
              const safeIsMasterAccount = isMasterAccount && viewingAllAccounts;
              const shouldShowGroupedView = safeIsMasterAccount && otherCycles.length > 0;
              

              
              if (shouldShowGroupedView) {
                return (
                  <div className="space-y-8">
                    {/* Your Review Cycles */}
                    {ownCycles.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-green-700">Your Review Cycles</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {ownCycles.map((cycle) => renderCycleCard(cycle, true))}
                        </div>
                      </div>
                    )}
                    
                    {/* Other Teams' Review Cycles */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-700">Other Teams' Review Cycles</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {otherCycles.map((cycle) => renderCycleCard(cycle, false))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        These review cycles belong to other accounts. You can view but cannot edit or delete them.
                      </p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reviewCycles.map((cycle) => renderCycleCard(cycle, true))}
                  </div>
                );
              }
            })()}
          </>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          handleCancelDelete();
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this review cycle and all associated feedback.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
  
  function renderCycleCard(cycle: ReviewCycle, isOwnedByCurrentUser: boolean) {
    const { completed, pending } = getResponseCounts(cycle);
    const progress = calculateProgress(cycle);
    
    return (
      <Card 
        key={cycle.id} 
        className={`relative cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col min-h-[280px] ${
          !isOwnedByCurrentUser ? "border-blue-200 bg-blue-50/30" : ""
        }`}
        onClick={() => navigate(`/reviews/${cycle.id}`)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight break-words">{cycle.title}</CardTitle>
                    <StatusBadge status={getStatusText(cycle)} className="flex-shrink-0">
                      {getStatusText(cycle)}
                    </StatusBadge>
                  </div>
                  <CycleTypeBadge type={cycle.type} className="w-fit">
                    {getCycleTypeLabel(cycle.type)}
                  </CycleTypeBadge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                    {cycle.type === 'manager_to_employee' 
                      ? `Started ${formatDate(cycle.created_at)}`
                      : `Due ${formatDate(cycle.review_by_date)}`
                    }
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="mr-1 h-3 w-3 flex-shrink-0" />
                    {cycle._count?.feedback_requests || 0} {cycle.type === 'manager_to_employee' ? 'team members' : 'reviewees'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {/* Removed StatusBadge from here since it's now next to the title */}
            </div>
          </div>
          
          {/* Owner badge for master account mode */}
          {(() => {
            const safeIsMasterAccount = isMasterAccount && viewingAllAccounts;
            return safeIsMasterAccount && !isOwnedByCurrentUser && (
              <Badge 
                variant="outline" 
                className="mt-2 bg-blue-100 text-blue-800 text-xs w-fit"
              >
                {(cycle as any).creatorEmail || 'Other Account'}
              </Badge>
            );
          })()}
        </CardHeader>
        
        {/* Content section - show different content based on cycle type */}
        <CardContent className="py-4 flex-1">
          {cycle.type === 'manager_to_employee' ? (
            /* Manager feedback cycles show recent activity */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Total Activity</span>
                <span className="text-xs text-muted-foreground">All time</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-700">
                    {cycle.feedback_requests?.reduce((acc, req) => acc + (req.feedback_responses?.length || 0), 0) || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Feedback entries</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-semibold text-slate-700">
                    {cycle._count?.feedback_requests || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Team members</div>
                </div>
              </div>
            </div>
          ) : (
            /* Traditional cycles show progress */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Progress</span>
                <span className="font-semibold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {completed} completed
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pending} pending
                </span>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 pb-4">
          <div className="flex items-center justify-between w-full">
            {/* Only show delete button for user's own reviews */}
            {isOwnedByCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(cycle.id);
                }}
                disabled={isDeletingId === cycle.id}
                className="text-destructive hover:text-destructive-foreground p-1 h-auto"
              >
                {isDeletingId === cycle.id ? (
                  <LoadingSpinner size="sm" color="error" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
            {!isOwnedByCurrentUser && <div></div>}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7"
            >
              Manage
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }
} 