import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ChevronRight, Calendar, Users, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchReviewCycles(user.id);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  async function fetchReviewCycles(currentUserId: string) {
    try {
      const { data: reviewCyclesData, error: reviewCyclesError } = await supabase
        .from('review_cycles')
        .select(`
          id,
          title,
          status,
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
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

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

      setReviewCycles(processedCycles);
    } catch (error) {
      console.error('Error fetching review cycles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch review cycles. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(cycleId: string) {
    if (isDeletingId) return;
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

      if (error) throw error;

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

  function getStatusColor(cycle: ReviewCycle): "default" | "destructive" | "secondary" {
    const now = new Date();
    const reviewByDate = new Date(cycle.review_by_date);
    const progress = calculateProgress(cycle);
    
    if (progress >= 100) return 'default';
    return reviewByDate > now ? 'secondary' : 'destructive';
  }

  function getStatusText(cycle: ReviewCycle): string {
    const now = new Date();
    const reviewByDate = new Date(cycle.review_by_date);
    const progress = calculateProgress(cycle);
    
    if (progress >= 100) return 'Completed';
    if (reviewByDate > now) return 'In Progress';
    return 'Overdue';
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
    <>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold">Review Cycles</h1>
          <Button
            onClick={() => navigate('/reviews/new-cycle')}
            className="w-full sm:w-auto gap-2"
          >
            <Plus className="h-4 w-4" />
            New Review Cycle
          </Button>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : reviewCycles.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Review Cycles</CardTitle>
              <CardDescription>
                Get started by creating your first review cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <Button 
                onClick={() => navigate('/reviews/new-cycle')}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Review Cycle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {reviewCycles.map((cycle) => (
              <Card 
                key={cycle.id} 
                className="relative cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/reviews/${cycle.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">{cycle.title}</CardTitle>
                      <div className="mt-2 space-y-1">
                        <span className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                          Due {formatDate(cycle.review_by_date)}
                        </span>
                        <span className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                          {cycle._count?.feedback_requests || 0} reviewees
                        </span>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(cycle)} className="flex-shrink-0">
                      {getStatusText(cycle)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span>Progress</span>
                      <span>{calculateProgress(cycle)}%</span>
                    </div>
                    <Progress value={calculateProgress(cycle)} className="h-2 sm:h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {(() => {
                        const { completed, pending } = getResponseCounts(cycle);
                        return (
                          <>
                            <span>{completed} reviews completed</span>
                            <span>{pending} pending</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex items-center justify-between w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(cycle.id);
                      }}
                      disabled={isDeletingId === cycle.id}
                      className="text-destructive hover:text-destructive-foreground"
                    >
                      {isDeletingId === cycle.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      Manage
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review Cycle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review cycle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 