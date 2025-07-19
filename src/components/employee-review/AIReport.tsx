import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, RefreshCw, FileDown, ChevronDown } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import { FeedbackResponse } from '@/types/feedback';
import { MarkdownEditor } from '@/components/feedback/MarkdownEditor';
import { useToast } from '@/components/ui/use-toast';
import { ReviewCycleType } from '@/types/survey';
import { LoadingSpinner, LoadingButton, ProgressStep, LoadingContainer } from '@/components/ui/loading-variants';
import { Badge } from '@/components/ui/badge';

interface Props {
  feedbackRequest: {
    id: string;
    employee?: {
      name: string;
      role: string;
    };
    feedback?: FeedbackResponse[];
    ai_reports?: Array<{
      content: string;
      updated_at: string;
    }>;
  };
  onExportPDF: () => void;
  onReportChange?: (value: string) => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  generationStep: number;
  startTime: number | null;
  elapsedSeconds: number;
  surveyType?: ReviewCycleType;
  isSaving?: boolean;
  hideHeader?: boolean; // Hide the section header when used within another section
}

const generationSteps = [
  "Analyzing feedback responses...",
  "Identifying key themes and patterns...",
  "Evaluating performance metrics...",
  "Finalizing comprehensive report..."
];

// Key for localStorage
const LOCAL_STORAGE_KEY = 'performanceSummaryExpanded';

export function AIReport({ 
  feedbackRequest, 
  onExportPDF, 
  onReportChange,
  onGenerateReport,
  isGeneratingReport,
  generationStep,
  startTime,
  elapsedSeconds,
  surveyType,
  isSaving = false,
  hideHeader = false
}: Props) {
  const { toast } = useToast();
  
  const [aiReport, setAiReport] = useState<{ content: string; created_at: string; } | null>(() => {
    // Initialize with existing report if available
    if (feedbackRequest?.ai_reports?.[0]) {
      return {
        content: feedbackRequest.ai_reports[0].content,
        created_at: feedbackRequest.ai_reports[0].updated_at
      };
    }
    return null;
  });

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  // Create ProgressSteps for report generation
  const getGenerationSteps = (): ProgressStep[] => {
    return generationSteps.map((label, index) => ({
      id: `step-${index}`,
      label,
      status: isGeneratingReport 
        ? (index < generationStep ? 'completed' : index === generationStep ? 'in_progress' : 'pending')
        : 'pending'
    }));
  };

  // Update local button state based on parent component state
  useEffect(() => {
    if (isGeneratingReport) {
      setIsButtonLoading(true);
    } else {
      // Only reset button state after a short delay to avoid UI flicker
      const timeout = setTimeout(() => {
        setIsButtonLoading(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isGeneratingReport]);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isReportOpen));
    }
  }, [isReportOpen]);

  // Handle updates to feedback request
  useEffect(() => {
    if (feedbackRequest?.ai_reports?.[0]) {
      const newReport = {
        content: feedbackRequest.ai_reports[0].content,
        created_at: feedbackRequest.ai_reports[0].updated_at
      };
      
      // Only update if the content actually changed
      setAiReport(prev => {
        if (!prev || prev.content !== newReport.content) {
          return newReport;
        }
        return prev;
      });
    } else if (!isGeneratingReport) {
      // Only clear the report if we're not generating (to avoid clearing during generation)
      setAiReport(null);
    }
  }, [feedbackRequest?.ai_reports, isGeneratingReport]);

  // Handle generation completion
  useEffect(() => {
    if (!isGeneratingReport && isButtonLoading) {
      setIsButtonLoading(false);
    }
  }, [isGeneratingReport, isButtonLoading]);

  // Add page leave warning during AI report generation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isGeneratingReport) {
        const message = 'AI report generation is in progress. Leaving now will cancel the generation. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (isGeneratingReport) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isGeneratingReport]);

  const handleToggleExpand = () => {
    const newValue = !isReportOpen;
    setIsReportOpen(newValue);
    localStorage.setItem(LOCAL_STORAGE_KEY, newValue.toString());
  };

  const handleGenerateReport = async () => {
    setIsButtonLoading(true);
    try {
      await onGenerateReport();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsButtonLoading(false);
    }
  };

  const handleReportChange = (value: string) => {
    setAiReport(prev => prev ? {
      ...prev,
      content: value
    } : null);
    // Call the parent's change handler (from useAIReportManagement)
    onReportChange?.(value);
  };

  const formatLastAnalyzed = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'recently';
    }
  };

  // Get the report type label based on survey type
  const getReportTypeLabel = () => {
      return surveyType === 'manager_effectiveness'
    ? 'Manager Effectiveness Report'
    : surveyType === 'manager_to_employee'
    ? 'Manager to Employee Feedback Report'
    : '360-Degree Feedback Report';
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">AI-Generated Report</h2>
        </div>
      )}

      <Card>
        <CardHeader 
          onClick={handleToggleExpand}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">AI Report</CardTitle>
              {aiReport?.created_at && (
                <Badge variant="outline" className="text-xs">
                  Generated {formatLastAnalyzed(aiReport.created_at)}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn("h-5 w-5 transition-transform", isReportOpen && "rotate-180")} />
          </div>
        </CardHeader>

        {isReportOpen && (
          <CardContent className="pt-0">
            {aiReport ? (
              <div>
                {aiReport.content ? (
                  <div className="w-full">
                    <MarkdownEditor
                      value={aiReport.content}
                      onChange={handleReportChange}
                      isSaving={isSaving}
                      actionButtons={
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onExportPDF}
                            disabled={isGeneratingReport || isButtonLoading || !aiReport.content}
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                          <LoadingButton
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport || isButtonLoading || !feedbackRequest?.feedback?.length}
                            isLoading={isGeneratingReport || isButtonLoading}
                            loadingText={generationSteps[generationStep] || "Starting generation..."}
                            className="whitespace-nowrap"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </LoadingButton>
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-4 border border-primary/20 rounded-lg p-6 bg-primary/5">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    {feedbackRequest?.feedback?.length ? (
                      <>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Report Content Missing</h3>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            The report content has been removed or is not available. 
                            Click below to regenerate the report.
                          </p>
                        </div>
                        <LoadingButton
                          size="lg"
                          onClick={handleGenerateReport}
                          disabled={isGeneratingReport || isButtonLoading}
                          isLoading={isGeneratingReport || isButtonLoading}
                          loadingText="Preparing report..."
                          className="mt-4"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>Regenerate Report</span>
                        </LoadingButton>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Waiting for Reviews</h3>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            No reviews have been submitted yet. The AI report will be available once feedback is collected.
                          </p>
                        </div>
                        <Button
                          size="lg"
                          disabled
                          className="mt-4"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : isGeneratingReport ? (
              <LoadingContainer
                title="Generating AI Report"
                description={`${generationSteps[generationStep]} (${elapsedSeconds}s elapsed)`}
                steps={getGenerationSteps()}
                showProgress={true}
                size="md"
                className="py-4"
              >
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    This process typically takes 30-45 seconds to complete.
                    We're using AI to carefully analyze all feedback and generate comprehensive insights.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800 text-center font-medium">
                      ⚠️ Please do not leave or refresh this page while the report is being generated
                    </p>
                  </div>
                </div>
              </LoadingContainer>
            ) : (
              <div className="text-center space-y-4 border border-primary/20 rounded-lg p-6 bg-primary/5">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                {feedbackRequest?.feedback?.length ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Ready to Generate Report</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        {feedbackRequest.feedback.length} {feedbackRequest.feedback.length === 1 ? 'review' : 'reviews'} collected. 
                        Click below to generate an AI-powered analysis of the feedback.
                      </p>
                    </div>
                    <LoadingButton
                      size="lg"
                      onClick={handleGenerateReport}
                      disabled={isButtonLoading}
                      isLoading={isButtonLoading}
                      loadingText="Preparing report..."
                      className="mt-4"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>Generate Report</span>
                    </LoadingButton>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Waiting for Reviews</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        No reviews have been submitted yet. The AI report will be available once feedback is collected.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      disabled
                      className="mt-4"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
} 