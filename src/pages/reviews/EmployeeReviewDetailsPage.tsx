import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { getFeedbackDate } from '@/utils/report';
import { exportToPDF } from '@/utils/pdf';
import { useFeedbackManagement } from '@/hooks/useFeedbackManagement';
import { useAIReportManagement } from '@/hooks/useAIReportManagement';
import { useEmployeeReviewData } from '@/hooks/useEmployeeReviewData';
import { ErrorMessage } from '@/components/ui/loading-variants';
import { EmployeeReviewHeader } from '@/components/employee-review/EmployeeReviewHeader';
import { ManagerFeedbackSection } from '@/components/employee-review/ManagerFeedbackSection';
import { AnalyticsSection } from '@/components/employee-review/AnalyticsSection';
import { ReportSection } from '@/components/employee-review/ReportSection';
import { DetailedFeedbackSection } from '@/components/employee-review/DetailedFeedbackSection';

export function EmployeeReviewDetailsPage() {
  const params = useParams<{ cycleId: string; employeeId: string }>();
  const cycleId = params.cycleId!;
  const employeeId = params.employeeId!;
  const navigate = useNavigate();
  const { toast } = useToast();

  // Memoize navigation callback to prevent infinite loops
  const onNavigateBack = useCallback(() => {
    navigate(`/reviews/${cycleId}`);
  }, [navigate, cycleId]);

  // Custom hook for data management
  const {
    isLoading,
    error,
    reviewCycle,
    feedbackRequest,
    surveyQuestions,
    surveyQuestionOrder,
    isQuestionsLoading,
    fetchData,
    setFeedbackRequest,
    getQuestionTextById
  } = useEmployeeReviewData({
    cycleId,
    employeeId,
    onNavigateBack
  });

  // Feedback management hook
  const {
    deletingFeedbackId,
    isDeleteDialogOpen,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    setIsDeleteDialogOpen
  } = useFeedbackManagement({
    feedbackRequest,
    onFeedbackUpdate: setFeedbackRequest
  });

  // State for time range (will be passed from ReportSection)
  const [currentTimeRange, setCurrentTimeRange] = useState<any>(null);

  // AI report management hook
  const {
    isGeneratingReport,
    aiReport,
    generationStep,
    startTime,
    elapsedSeconds,
    isSaving,
    handleReportChange,
    handleGenerateReport: generateReport
  } = useAIReportManagement({
    feedbackRequest,
    surveyType: reviewCycle?.type,
    onSuccessfulGeneration: fetchData,
    surveyQuestions,
    surveyQuestionOrder,
    timeRange: currentTimeRange
  });

  // Wrapper function to handle time range
  const handleGenerateReport = (timeRange?: any) => {
    setCurrentTimeRange(timeRange);
    // Pass timeRange directly to avoid race condition
    generateReport(timeRange);
  };

  // Sorted feedback memo
  const sortedFeedback = useMemo(() => 
    feedbackRequest?.feedback?.sort((a, b) => getFeedbackDate(b) - getFeedbackDate(a)) ?? [],
    [feedbackRequest?.feedback]
  );

  // Determine if this is a manager effectiveness survey
  const isManagerSurvey = reviewCycle?.type === 'manager_effectiveness';

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle copy link functionality
  const handleCopyLink = useCallback(async () => {
    if (!feedbackRequest?.unique_link) return;
    
    const feedbackUrl = `${window.location.origin}/feedback/${feedbackRequest.unique_link}`;
    
    try {
      await navigator.clipboard.writeText(feedbackUrl);
      toast({
        title: "Link copied!",
        description: "The feedback link has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  }, [feedbackRequest?.unique_link, toast]);

  // Handle copy all responses functionality  
  const handleCopyResponses = useCallback(async () => {
    if (!feedbackRequest?.feedback?.length) return;

    const responses = sortedFeedback.map((feedback, index) => {
      let responseText = `Response ${index + 1}:\n`;
      responseText += `Relationship: ${feedback.relationship}\n`;
      responseText += `Date: ${new Date(feedback.submitted_at ?? feedback.created_at ?? 0).toLocaleDateString()}\n\n`;
      
      if (feedback.strengths) {
        responseText += `Strengths:\n${feedback.strengths}\n\n`;
      }
      
      if (feedback.areas_for_improvement) {
        responseText += `Areas for Improvement:\n${feedback.areas_for_improvement}\n\n`;
      }
      
      return responseText;
    }).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(responses);
      toast({
        title: "Responses copied!",
        description: "All feedback responses have been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy responses:', err);
      toast({
        title: "Failed to copy",
        description: "Please copy the responses manually.",
        variant: "destructive",
      });
    }
  }, [sortedFeedback, feedbackRequest?.feedback?.length, toast]);

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!aiReport?.content || !feedbackRequest?.employee?.name) return;
    
    // Prepare chart options for manager surveys
    const pdfOptions = {
      includeCharts: isManagerSurvey && feedbackRequest?.feedback && feedbackRequest.feedback.length > 0,
      surveyType: reviewCycle?.type,
      feedbackResponses: feedbackRequest?.feedback as CoreFeedbackResponse[],
      questionIdToTextMap: surveyQuestions,
      questionOrder: surveyQuestionOrder
    };
    
    await exportToPDF(
      aiReport.content,
      `${feedbackRequest.employee.name}_Feedback_Report.pdf`,
      pdfOptions
    );
  }, [aiReport?.content, feedbackRequest?.employee?.name, isManagerSurvey, feedbackRequest?.feedback, reviewCycle?.type, surveyQuestions, surveyQuestionOrder]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-5 w-5" />
          <ErrorMessage message={error} size="md" />
        </div>
        <Button variant="outline" onClick={() => navigate(`/reviews/${cycleId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review Cycle
        </Button>
      </div>
    );
  }

  // Guard clause
  if (!reviewCycle || !feedbackRequest) return null;

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <EmployeeReviewHeader
        reviewCycle={reviewCycle}
        feedbackRequest={feedbackRequest}
        onNavigateBack={() => navigate(`/reviews/${cycleId}`)}
        onCopyLink={handleCopyLink}
      />

      {/* Manager Feedback Input - Primary section for manager-to-employee cycles */}
      <ManagerFeedbackSection
        reviewCycle={reviewCycle}
        feedbackRequest={feedbackRequest}
        cycleId={cycleId}
        onSubmissionSuccess={fetchData}
      />

      {/* Analytics Section */}
      <AnalyticsSection
        reviewCycle={reviewCycle}
        feedbackRequest={feedbackRequest}
        surveyQuestions={surveyQuestions}
        surveyQuestionOrder={surveyQuestionOrder}
      />

      {/* Report Section */}
      <ReportSection
        reviewCycle={reviewCycle}
        feedbackRequest={feedbackRequest}
        aiReport={aiReport}
        onExportPDF={handleExportPDF}
        onReportChange={handleReportChange}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        generationStep={generationStep}
        startTime={startTime}
        elapsedSeconds={elapsedSeconds}
        isSaving={isSaving}
      />

      {/* Detailed Feedback Section */}
      <DetailedFeedbackSection
        reviewCycle={reviewCycle}
        feedbackRequest={feedbackRequest}
        sortedFeedback={sortedFeedback}
        surveyQuestions={surveyQuestions}
        surveyQuestionOrder={surveyQuestionOrder}
        isQuestionsLoading={isQuestionsLoading}
        deletingFeedbackId={deletingFeedbackId}
        getQuestionTextById={getQuestionTextById}
        onDeleteClick={handleDeleteClick}
        onCopyResponses={handleCopyResponses}
      />

      {/* Delete Dialog */}
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