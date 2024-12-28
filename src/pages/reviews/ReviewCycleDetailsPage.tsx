import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReviewCycle, FeedbackRequest, REQUEST_STATUS } from '@/types/review';

function determineRequestStatus(
  responseCount: number,
  targetResponses: number,
  manuallyCompleted: boolean
): REQUEST_STATUS {
  if (manuallyCompleted) return REQUEST_STATUS.COMPLETED;
  if (responseCount === 0) return REQUEST_STATUS.PENDING;
  if (responseCount < targetResponses) return REQUEST_STATUS.IN_PROGRESS;
  if (responseCount === targetResponses) return REQUEST_STATUS.COMPLETED;
  return REQUEST_STATUS.EXCEEDED;
}

export function ReviewCycleDetailsPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  async function fetchData() {
    if (!cycleId) return;

    try {
      setIsLoading(true);

      // Fetch review cycle data
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
              role
            ),
            feedback_responses (
              id,
              submitted_at,
              relationship
            )
          )
        `)
        .eq('id', cycleId)
        .single();

      if (cycleError) throw cycleError;

      // Process feedback requests
      const processedRequests = cycleData.feedback_requests.map((request: any) => {
        const responseCount = request.feedback_responses?.length || 0;
        const status = determineRequestStatus(
          responseCount,
          request.target_responses,
          request.manually_completed
        );

        return {
          ...request,
          status,
          feedback: request.feedback_responses,
          _count: {
            responses: responseCount
          }
        };
      });

      setReviewCycle(cycleData);
      setFeedbackRequests(processedRequests);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load review cycle details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyLink(uniqueLink: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feedback/${uniqueLink}`);
      toast({
        title: "Success",
        description: "Feedback link copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  }

  async function handleRemoveEmployee(requestId: string) {
    if (!confirm('Are you sure you want to remove this employee from the review cycle?')) return;

    setRemovingEmployeeId(requestId);
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setFeedbackRequests(prev => prev.filter(req => req.id !== requestId));
      toast({
        title: "Success",
        description: "Employee removed from review cycle",
      });
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      });
    } finally {
      setRemovingEmployeeId(null);
    }
  }

  function getStatusBadgeVariant(request: FeedbackRequest) {
    switch (request.status) {
      case REQUEST_STATUS.COMPLETED:
        return 'default';
      case REQUEST_STATUS.IN_PROGRESS:
        return 'secondary';
      case REQUEST_STATUS.PENDING:
        return 'outline';
      case REQUEST_STATUS.EXCEEDED:
        return 'destructive';
      default:
        return 'outline';
    }
  }

  function getStatusText(request: FeedbackRequest) {
    const count = request._count?.responses || 0;
    const target = request.target_responses;
    return `${count}/${target} responses`;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!reviewCycle) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reviews')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review Cycles
          </Button>
          <h1 className="text-2xl font-bold">{reviewCycle.title}</h1>
        </div>
        <Button onClick={() => navigate(`/reviews/${cycleId}/add-employees`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employees
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {feedbackRequests.map((request) => (
          <Card 
            key={request.id}
            className="group cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/reviews/${cycleId}/employee/${request.employee_id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {request.employee?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{request.employee?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{request.employee?.role}</p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(request)}>
                  {getStatusText(request)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>
                    {Math.round((request._count.responses / request.target_responses) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(request._count.responses / request.target_responses) * 100} 
                  className="h-2"
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(request.unique_link);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmployee(request.id);
                    }}
                    disabled={removingEmployeeId === request.id}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    {removingEmployeeId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 