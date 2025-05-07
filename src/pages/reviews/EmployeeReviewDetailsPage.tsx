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
import { ArrowLeft, Loader2, Trash2, Copy, AlertCircle, ArrowUpIcon, EqualIcon, ArrowDownIcon, StarIcon, TrendingUpIcon, Users } from 'lucide-react';
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
import { ReviewCycleType, SurveyQuestion } from '@/types/survey';
import { ManagerSurveyAnalytics } from '@/components/employee-review/ManagerSurveyAnalytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Helper function to render the survey type badge
function getSurveyTypeBadge(type?: ReviewCycleType) {
  const tooltipText = type === 'manager_effectiveness' 
    ? "Manager Effectiveness Surveys collect structured feedback about management skills, leadership qualities, and team support. Responses are collected anonymously to ensure honest feedback."
    : "360° Feedback provides a comprehensive view of performance from multiple perspectives including peers, direct reports, and senior colleagues.";
  
  return type === 'manager_effectiveness' ? (
    <Badge 
      variant="outline" 
      className="bg-blue-50 text-blue-700 border-blue-200 cursor-help"
      title={tooltipText}
    >
      Manager Survey
    </Badge>
  ) : (
    <Badge 
      variant="outline" 
      className="bg-green-50 text-green-700 border-green-200 cursor-help"
      title={tooltipText}
    >
      360° Feedback
    </Badge>
  );
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
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [surveyQuestionOrder, setSurveyQuestionOrder] = useState<Record<string, number>>({});
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

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

  // Get question text by ID using the fetched questions from the database
  const getQuestionTextById = (questionId: string): string => {
    if (surveyQuestions[questionId]) {
      return surveyQuestions[questionId];
    }
    
    // Fallback if question not found
    return `Question ${questionId.slice(0, 8)}...`;
  };

  // Fetch survey questions based on the review cycle type
  useEffect(() => {
    if (reviewCycle?.type) {
      fetchSurveyQuestions(reviewCycle.type);
    }
  }, [reviewCycle?.type]);

  const fetchSurveyQuestions = async (cycleType: ReviewCycleType) => {
    try {
      // Clear any existing questions first and set loading state
      setSurveyQuestions({});
      setSurveyQuestionOrder({});
      setIsQuestionsLoading(true);
      
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text, order')
        .eq('review_cycle_type', cycleType)
        .order('order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No questions found for survey type: ${cycleType}`);
        toast({
          title: "Warning",
          description: `Could not load survey questions for ${cycleType === 'manager_effectiveness' ? 'Manager Survey' : '360° Feedback'}`,
          variant: "destructive",
        });
        setIsQuestionsLoading(false);
        return;
      }

      // Create a map of question IDs to question text and order
      const questionMap: Record<string, string> = {};
      const orderMap: Record<string, number> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
        orderMap[question.id] = question.order;
      });

      setSurveyQuestions(questionMap);
      setSurveyQuestionOrder(orderMap);
      console.log(`Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err) {
      console.error('Error fetching survey questions:', err);
      toast({
        title: "Error",
        description: "Could not load survey questions. Some question text may not display correctly.",
        variant: "destructive",
      });
      
      // Retry once after a short delay
      setTimeout(() => {
        console.log('Retrying survey question fetch...');
        fetchSurveyQuestionsRetry(cycleType);
      }, 2000);
    } finally {
      setIsQuestionsLoading(false);
    }
  };
  
  // Retry function with simplified error handling
  const fetchSurveyQuestionsRetry = async (cycleType: ReviewCycleType) => {
    try {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text, order')
        .eq('review_cycle_type', cycleType)
        .order('order', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.warn(`Retry: No questions found for survey type: ${cycleType}`);
        return;
      }

      // Create a map of question IDs to question text and order
      const questionMap: Record<string, string> = {};
      const orderMap: Record<string, number> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
        orderMap[question.id] = question.order;
      });

      setSurveyQuestions(questionMap);
      setSurveyQuestionOrder(orderMap);
      console.log(`Retry successful: Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err) {
      console.error('Error in retry fetch for survey questions:', err);
    }
  };

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
        // Create a base text for relationship and timestamp
        let responseText = `Submitted: ${response.submitted_at ? new Date(response.submitted_at).toLocaleDateString() : 'Not available'}\n`;
        
        // Only include relationship for 360 reviews, not for manager surveys
        if (!isManagerSurvey) {
          responseText += `Relationship: ${response.relationship}\n`;
        }
        
        // Add structured responses for manager effectiveness surveys
        if (isManagerSurvey && response.responses) {
          responseText += 'Survey Responses:\n';
          
          // Get and sort the response entries by question order
          const sortedResponses = Object.entries(response.responses)
            .sort(([idA], [idB]) => {
              const orderA = surveyQuestionOrder[idA] ?? 999;
              const orderB = surveyQuestionOrder[idB] ?? 999;
              return orderA - orderB;
            });
          
          // Add each question and answer to the response text
          sortedResponses.forEach(([questionId, value]) => {
            const questionText = getQuestionTextById(questionId);
            const formattedValue = typeof value === 'number' 
              ? `${value} - ${
                  value === 1 ? 'Strongly Disagree' :
                  value === 2 ? 'Disagree' :
                  value === 3 ? 'Neither agree nor disagree' :
                  value === 4 ? 'Agree' :
                  'Strongly Agree'
                }`
              : value;
            
            responseText += `- ${questionText}\n  ${formattedValue}\n`;
          });
          responseText += '\n';
        }
        
        // Add strengths and areas for improvement
        responseText += `Strengths: ${response.strengths || 'None provided'}\n`;
        responseText += `Areas for Improvement: ${response.areas_for_improvement || 'None provided'}`;
        
        return responseText + '\n----------------------------------------';
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
              created_at,
              responses
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

      // Once we have the review cycle data, fetch the survey questions
      if (cycleData.type) {
        fetchSurveyQuestions(cycleData.type);
      }

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

  // Determine if this is a manager effectiveness survey
  const isManagerSurvey = reviewCycle?.type === 'manager_effectiveness';

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
    <TooltipProvider>
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
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-xl font-bold">{feedbackRequest?.employee?.name}</h1>
                <p className="text-sm text-muted-foreground">{feedbackRequest?.employee?.role}</p>
              </div>
              {getSurveyTypeBadge(reviewCycle.type)}
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

        {/* Manager Survey Analytics - Only show for manager effectiveness surveys with responses */}
        {isManagerSurvey && feedbackRequest?.feedback && feedbackRequest.feedback.length > 0 && (
          <section className="space-y-4 pb-6">
            <ManagerSurveyAnalytics 
              feedbackResponses={feedbackRequest.feedback} 
              questionIdToTextMap={surveyQuestions}
              questionOrder={surveyQuestionOrder}
            />
          </section>
        )}

        {/* Analytics Section - Only show for 360 feedback */}
        {!isManagerSurvey && feedbackRequest?.feedback && feedbackRequest.feedback.length > 0 && (
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
            surveyType={reviewCycle.type}
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Survey Type</p>
                    <div>{getSurveyTypeBadge(reviewCycle.type)}</div>
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
                              {/* Only show relationship badge for 360 reviews, not for manager surveys */}
                              {!isManagerSurvey && (
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
                              )}
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
                            {/* For manager surveys, show structured responses if available */}
                            {isManagerSurvey && feedback.responses && Object.keys(feedback.responses).length > 0 && (
                              <div key={`${feedback.id}-structured`} className="bg-blue-50 p-4 rounded-md space-y-4">
                                <h4 className="text-sm font-medium text-blue-800">Survey Responses</h4>
                                
                                {isQuestionsLoading ? (
                                  <div className="py-2 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-sm text-blue-600">Loading questions...</span>
                                  </div>
                                ) : (
                                  // Sort responses by question order and then render
                                  Object.entries(feedback.responses || {})
                                    .sort(([idA], [idB]) => {
                                      // Sort by question order, fallback to questionId if order not available
                                      const orderA = surveyQuestionOrder[idA] ?? 999;
                                      const orderB = surveyQuestionOrder[idB] ?? 999;
                                      return orderA - orderB;
                                    })
                                    .map(([questionId, value]) => {
                                      // Get question text from question ID using the fetched questions
                                      const questionText = getQuestionTextById(questionId);
                                      
                                      // Format the value based on whether it's a number (Likert) or string (open-ended)
                                      const formattedValue = typeof value === 'number' 
                                        ? (
                                          <div className="flex items-center gap-2">
                                            <span className={cn(
                                              "px-2 py-1 rounded-full text-xs font-medium",
                                              value === 1 && "bg-red-100 text-red-800",
                                              value === 2 && "bg-orange-100 text-orange-800",
                                              value === 3 && "bg-yellow-100 text-yellow-800",
                                              value === 4 && "bg-green-100 text-green-800",
                                              value === 5 && "bg-emerald-100 text-emerald-800"
                                            )}>
                                              {value}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                              {value === 1 && "Strongly Disagree"}
                                              {value === 2 && "Disagree"}
                                              {value === 3 && "Neither agree nor disagree"}
                                              {value === 4 && "Agree"}
                                              {value === 5 && "Strongly Agree"}
                                            </span>
                                          </div>
                                        ) 
                                        : <span className="text-sm">{value}</span>;
                                      
                                      return (
                                        <div key={`${feedback.id}-q-${questionId}`} className="space-y-2 border-b border-blue-100 pb-3 last:border-0 last:pb-0">
                                          <span className="text-blue-800 font-medium block">{questionText}</span>
                                          <div className="pl-2">{formattedValue}</div>
                                        </div>
                                      );
                                    })
                                )}
                              </div>
                            )}
                            
                            {/* Show strengths for both survey types */}
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
                            
                            {/* Show areas for improvement for both survey types */}
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
    </TooltipProvider>
  );
}