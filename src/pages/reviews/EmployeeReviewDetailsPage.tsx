import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Trash2, Copy, AlertCircle, ArrowUpIcon, EqualIcon, ArrowDownIcon, StarIcon, TrendingUpIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FeedbackAnalytics } from '@/components/employee-review/FeedbackAnalytics';
import { AIReport } from '@/components/employee-review/AIReport';
import { cn } from '@/lib/utils';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { getFeedbackDate } from '@/utils/report';
import { exportToPDF } from '@/utils/pdf';
import { useFeedbackManagement } from '@/hooks/useFeedbackManagement';
import { useAIReportManagement } from '@/hooks/useAIReportManagement';

function getStatusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'exceeded':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function EmployeeReviewDetailsPage() {
  const params = useParams<{ cycleId: string; employeeId: string }>();
  const cycleId = params.cycleId;
  const employeeId = params.employeeId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);

  const {
    deletingFeedbackId,
    isDeleteDialogOpen,
    feedbackToDelete: _feedbackToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    setIsDeleteDialogOpen
  } = useFeedbackManagement({
    feedbackRequest,
    onFeedbackUpdate: setFeedbackRequest
  });

  const {
    isGeneratingReport,
    aiReport,
    generationStep,
    startTime,
    handleReportChange,
    handleGenerateReport,
    setAiReport
  } = useAIReportManagement({
    feedbackRequest
  });

  const sortedFeedback = useMemo(() => 
    feedbackRequest?.feedback?.sort((a, b) => getFeedbackDate(b) - getFeedbackDate(a)) ?? [],
    [feedbackRequest?.feedback]
  );

  const handleCopyLink = async () => {
    if (!feedbackRequest?.unique_link) return;
    
    const feedbackUrl = `${window.location.origin}/feedback/${feedbackRequest.unique_link}`;
    try {
      await navigator.clipboard.writeText(feedbackUrl);
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
  };

  const handleCopyResponses = async () => {
    if (!feedbackRequest?.feedback) return;
    
    const responsesText = feedbackRequest.feedback
      .filter((response: CoreFeedbackResponse) => response.submitted_at)
      .map((response: CoreFeedbackResponse) => {
        return `Relationship: ${response.relationship}
Strengths: ${response.strengths || 'None provided'}
Areas for Improvement: ${response.areas_for_improvement || 'None provided'}
Submitted: ${response.submitted_at ? new Date(response.submitted_at).toLocaleDateString() : 'Not available'}
----------------------------------------`;
      })
      .join('\n\n');

    await navigator.clipboard.writeText(responsesText);
    toast({
      title: "Copied",
      description: "All feedback responses have been copied to your clipboard",
    });
  };

  useEffect(() => {
    fetchData();
  }, [cycleId, employeeId]);

  async function fetchData() {
    if (!cycleId || !employeeId) return;

    try {
      setIsLoading(true);
      setError(null);

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
              relationship,
              strengths,
              areas_for_improvement,
              created_at
            ),
            ai_reports (
              content,
              updated_at
            )
          )
        `)
        .eq('id', cycleId)
        .eq('feedback_requests.employee_id', employeeId)
        .single();

      if (cycleError) throw cycleError;

      const request = cycleData.feedback_requests[0];
      setReviewCycle(cycleData);
      setFeedbackRequest({
        ...request,
        feedback: request.feedback_responses,
        _count: {
          responses: request.feedback_responses?.length || 0,
          page_views: 0,
          unique_viewers: 0
        }
      });

      if (request.ai_reports?.[0]?.content) {
        setAiReport({
          content: request.ai_reports[0].content,
          created_at: request.ai_reports[0].updated_at
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load employee review details');
      toast({
        title: "Error",
        description: "Failed to load employee review details",
        variant: "destructive",
      });
      navigate(`/reviews/${cycleId}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExportPDF = async () => {
    if (!aiReport?.content || !feedbackRequest?.employee?.name) return;
    await exportToPDF(
      aiReport.content,
      `${feedbackRequest.employee.name}_Feedback_Report.pdf`
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-5 w-5" />
          <p className="text-lg font-medium">{error}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/reviews/${cycleId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review Cycle
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!reviewCycle || !feedbackRequest) return null;

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate(`/reviews/${cycleId}`)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{feedbackRequest?.employee?.name}</h1>
            <p className="text-sm text-muted-foreground">{feedbackRequest?.employee?.role}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            key="copy-link"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Link
          </Button>
          <Button
            key="ai-report"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('ai-report')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-8 text-xs"
          >
            AI Report
          </Button>
          <Button
            key="detailed-feedback"
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('detailed-feedback')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-8 text-xs"
          >
            Detailed Feedback
          </Button>
        </div>
      </div>

      {/* Analytics Section */}
      {feedbackRequest?.feedback && feedbackRequest.feedback.length > 0 && (
        <section className="space-y-4 pb-6">
          <FeedbackAnalytics
            feedbackResponses={feedbackRequest.feedback}
            feedbackRequestId={feedbackRequest.id}
          />
        </section>
      )}

      {/* Report Section */}
      <section id="ai-report" className="space-y-4 py-6">
        <AIReport 
          feedbackRequest={{
            id: feedbackRequest?.id || '',
            employee: feedbackRequest?.employee,
            feedback: feedbackRequest?.feedback?.map(f => ({
              ...f,
              submitted_at: f.submitted_at || f.created_at
            })),
            ai_reports: feedbackRequest?.ai_reports
          }}
          onExportPDF={handleExportPDF}
          onReportChange={handleReportChange}
          onGenerateReport={handleGenerateReport}
          isGeneratingReport={isGeneratingReport}
          generationStep={generationStep}
          startTime={startTime}
        />
      </section>

      {/* Detailed Reviews Section */}
      <section id="detailed-feedback" className="space-y-4 pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Detailed Feedback Responses</h2>
          <p className="text-sm text-muted-foreground">
            Individual feedback responses from all reviewers
          </p>
        </div>

        {/* Overview and Feedback Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Overview Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Review Cycle</p>
                  <p className="text-sm font-medium">{reviewCycle?.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Due {reviewCycle?.review_by_date ? new Date(reviewCycle.review_by_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Completion</p>
                  <div className="space-y-2">
                    <Progress 
                      value={((feedbackRequest?._count?.responses || 0) / (feedbackRequest?.target_responses || 1)) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {feedbackRequest?._count?.responses} of {feedbackRequest?.target_responses} responses
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant={getStatusVariant(feedbackRequest?.status)}>
                    {feedbackRequest?.status}
                  </Badge>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={handleCopyResponses}
                  disabled={!feedbackRequest?.feedback?.length}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Responses
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Responses */}
          <div className="lg:col-span-9">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">Feedback Responses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!sortedFeedback.length ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No feedback responses yet.
                  </div>
                ) : (
                  <div className="divide-y">
                    {sortedFeedback.map((feedback) => (
                      <div key={`${feedback.id}-container`} className="p-4">
                        <div key={`${feedback.id}-header`} className="flex items-center justify-between mb-4">
                          <div key={`${feedback.id}-badge-container`} className="flex items-center gap-2">
                            <Badge 
                              key={`${feedback.id}-badge`}
                              variant="outline" 
                              className={cn(
                                "text-xs capitalize flex items-center gap-1",
                                feedback.relationship === 'senior_colleague' && 'bg-blue-50 border-blue-200',
                                feedback.relationship === 'equal_colleague' && 'bg-green-50 border-green-200',
                                feedback.relationship === 'junior_colleague' && 'bg-purple-50 border-purple-200'
                              )}
                            >
                              {feedback.relationship === 'senior_colleague' && <ArrowUpIcon key={`${feedback.id}-up-icon`} className="h-3 w-3" />}
                              {feedback.relationship === 'equal_colleague' && <EqualIcon key={`${feedback.id}-equal-icon`} className="h-3 w-3" />}
                              {feedback.relationship === 'junior_colleague' && <ArrowDownIcon key={`${feedback.id}-down-icon`} className="h-3 w-3" />}
                              {feedback.relationship.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div key={`${feedback.id}-actions`} className="flex items-center gap-4">
                            <span key={`${feedback.id}-date`} className="text-xs text-muted-foreground">
                              {new Date(feedback.submitted_at ?? feedback.created_at ?? 0).toLocaleDateString()}
                            </span>
                            <Button
                              key={`${feedback.id}-delete`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(feedback.id)}
                              className="h-7 px-2 text-destructive hover:text-destructive-foreground"
                              aria-label="Delete feedback"
                            >
                              {deletingFeedbackId === feedback.id ? (
                                <Loader2 key={`${feedback.id}-loader`} className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 key={`${feedback.id}-trash`} className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div key={`${feedback.id}-content`} className="space-y-4">
                          {feedback.strengths && (
                            <div key={`${feedback.id}-strengths`} className="bg-slate-50 p-3 rounded-md">
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <StarIcon className="h-4 w-4 text-yellow-500" />
                                Strengths
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {feedback.strengths}
                              </p>
                            </div>
                          )}
                          {feedback.areas_for_improvement && (
                            <div key={`${feedback.id}-improvements`} className="bg-slate-50 p-3 rounded-md">
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                Areas for Improvement
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {feedback.areas_for_improvement}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="focus-visible:outline-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this feedback response.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleDeleteCancel}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}