import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

export function ReviewCyclesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

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
            page_views (
              id,
              created_at,
              user_id,
              session_id,
              feedback_request_id,
              page_url
            ),
            ai_reports!ai_reports_feedback_request_id_fkey (
              id,
              status,
              is_final,
              created_at,
              updated_at,
              error,
              content,
              feedback_request_id
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
              if (new Date(request.created_at) < new Date(cycle.created_at)) {
                console.error(`Invalid timestamp for request ${request.id}: created before cycle`);
                return false;
              }

              // Process responses and validate status
              const validResponses = (request.feedback_responses || [])
                .filter(response => {
                  const isValid = 
                    new Date(response.created_at) >= new Date(request.created_at) &&
                    new Date(response.submitted_at) >= new Date(response.created_at);
                  
                  if (!isValid) {
                    console.error(`Invalid timestamp for response ${response.id}: timestamp mismatch`);
                  }
                  return isValid;
                })
                .map(response => ({
                  ...response,
                  relationship: response.relationship || 'equal_colleague',
                  strengths: response.strengths || null,
                  areas_for_improvement: response.areas_for_improvement || null,
                  overall_rating: response.overall_rating || 0
                }));

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

              // Process page views
              const pageViews = (request.page_views || []).map(view => ({
                ...view,
                feedback_request_id: request.id,
                page_url: view.page_url || `${window.location.origin}/feedback/${request.unique_link}`
              }));
              const uniqueViewers = new Set(pageViews.map(view => view.session_id)).size;

              return {
                ...request,
                status: correctStatus,
                feedback_responses: validResponses,
                page_views: pageViews,
                _count: {
                  page_views: pageViews.length,
                  unique_viewers: uniqueViewers,
                  responses: responseCount
                }
              } as FeedbackRequest;
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

    try {
      setIsDeletingId(cycleId);
      const { error } = await supabase
        .from('review_cycles')
        .delete()
        .eq('id', cycleId);

      if (error) throw error;

      setReviewCycles(reviewCycles.filter(cycle => cycle.id !== cycleId));
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
    }
  }

  function getStatusColor(cycle: ReviewCycle): "default" | "destructive" | "secondary" {
    const isOverdue = new Date(cycle.review_by_date) < new Date();
    const progress = calculateProgress(cycle);
    
    if (isOverdue && progress < 100) return 'destructive';
    return progress === 100 ? 'default' : 'secondary';
  }

  function getStatusText(cycle: ReviewCycle): string {
    const isOverdue = new Date(cycle.review_by_date) < new Date();
    const progress = calculateProgress(cycle);
    
    if (isOverdue && progress < 100) return 'Overdue';
    return progress === 100 ? 'Completed' : 'In Progress';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function calculateProgress(cycle: ReviewCycle): number {
    if (!cycle._count?.feedback_requests) return 0;
    const totalRequests = cycle._count.feedback_requests;
    const completedRequests = cycle._count.completed_feedback;
    return Math.round((completedRequests / totalRequests) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Cycles</h1>
        <Button onClick={() => navigate('/reviews/new-cycle')}>
          <Plus className="mr-2 h-4 w-4" />
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
            <Button onClick={() => navigate('/reviews/new-cycle')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Review Cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviewCycles.map((cycle) => (
            <Card 
              key={cycle.id} 
              className="relative cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/reviews/${cycle.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{cycle.title}</CardTitle>
                    <div className="mt-2 space-y-1">
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        Due {formatDate(cycle.review_by_date)}
                      </span>
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {cycle._count?.feedback_requests || 0} reviewees
                      </span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(cycle)}>
                    {getStatusText(cycle)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{calculateProgress(cycle)}%</span>
                  </div>
                  <Progress value={calculateProgress(cycle)} className="h-2" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(cycle.id);
                  }}
                  disabled={isDeletingId === cycle.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/reviews/${cycle.id}/manage`);
                  }}
                >
                  Manage
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 