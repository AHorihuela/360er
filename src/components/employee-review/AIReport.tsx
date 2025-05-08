import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, RefreshCw, FileDown, ChevronDown } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FeedbackResponse } from '@/types/feedback';
import { MarkdownEditor } from '@/components/feedback/MarkdownEditor';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from 'lodash';
import { ReviewCycleType } from '@/types/survey';

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
}

const generationSteps = [
  "Analyzing feedback responses...",
  "Identifying key themes and patterns...",
  "Evaluating performance metrics...",
  "Generating comprehensive insights...",
  "Finalizing report..."
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
  elapsedSeconds,
  surveyType
}: Props) {
  const { toast } = useToast();
  const [aiReport, setAiReport] = useState<{ content: string; created_at: string; } | null>(() => {
    // Initialize with existing report if available
    const existingReport = feedbackRequest.ai_reports?.[0];
    return existingReport ? {
      content: existingReport.content,
      created_at: existingReport.updated_at
    } : null;
  });
  
  // Track button loading state separately for immediate feedback
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  
  // Initialize expanded state from localStorage or defaults
  const [isReportOpen, setIsReportOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // First check localStorage for saved preference
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState !== null) {
        return JSON.parse(savedState);
      }
    }
    // Default to open if localStorage doesn't have a value
    return true;
  });

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

  // Auto-expand when a new report is generated
  useEffect(() => {
    if (feedbackRequest.ai_reports?.[0]) {
      const latestReport = feedbackRequest.ai_reports[0];
      setAiReport({
        content: latestReport.content,
        created_at: latestReport.updated_at
      });
    }
  }, [feedbackRequest.ai_reports]);

  const handleReportChange = debounce(async (newContent: string) => {
    if (!feedbackRequest?.id) return;

    try {
      const { error } = await supabase
        .from('ai_reports')
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('feedback_request_id', feedbackRequest.id);

      if (error) throw error;

      setAiReport(prev => prev ? {
        ...prev,
        content: newContent
      } : null);

      if (onReportChange) {
        onReportChange(newContent);
      }

    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report changes",
        variant: "destructive",
      });
    }
  }, 1000);

  // Handle generate report with immediate loading state
  const handleGenerateReport = () => {
    setIsButtonLoading(true);
    onGenerateReport();
  };

  const formatLastAnalyzed = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Get the report type label based on survey type
  const getReportTypeLabel = () => {
    return surveyType === 'manager_effectiveness' 
      ? 'Manager Effectiveness Report' 
      : '360-Degree Feedback Report';
  };

  // Handle toggle with localStorage update
  const handleToggleExpand = () => {
    setIsReportOpen(prevState => !prevState);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">AI-Generated Report</h2>
        {aiReport?.created_at && (
          <p className="text-sm text-muted-foreground">
            Generated {formatLastAnalyzed(aiReport.created_at)}
          </p>
        )}
      </div>

      <Card>
        <CardHeader 
          onClick={handleToggleExpand}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Performance Summary</CardTitle>
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
                      onChange={(value) => {
                        handleReportChange(value);
                        onReportChange?.(value);
                      }}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport || isButtonLoading || !feedbackRequest?.feedback?.length}
                            className="whitespace-nowrap"
                          >
                            {isGeneratingReport || isButtonLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {generationSteps[generationStep] || "Starting generation..."} {elapsedSeconds > 0 ? `(${elapsedSeconds}s)` : ''}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerate
                              </>
                            )}
                          </Button>
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-3 border border-primary/20 rounded-lg p-4 sm:p-6 bg-primary/5">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    {feedbackRequest?.feedback?.length ? (
                      <>
                        <h3 className="text-base font-semibold">Report Content Missing</h3>
                        <p className="text-muted-foreground text-sm px-2">
                          The report content has been removed or is not available. 
                          Click below to regenerate the report.
                        </p>
                        <Button
                          size="default"
                          onClick={handleGenerateReport}
                          disabled={isGeneratingReport || isButtonLoading}
                          className="mt-2 w-full sm:w-auto"
                        >
                          {isGeneratingReport || isButtonLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Preparing report...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              <span>Regenerate Report</span>
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base font-semibold">Waiting for Reviews</h3>
                        <p className="text-muted-foreground text-sm px-2">
                          No reviews have been submitted yet. The AI report will be available once feedback is collected.
                        </p>
                        <Button
                          size="default"
                          disabled
                          className="mt-2 w-full sm:w-auto"
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
              <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <div className="w-full max-w-md space-y-4">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium text-primary text-center px-4">
                      {generationSteps[generationStep]}
                    </p>
                  </div>

                  <div className="w-full space-y-2 px-4">
                    <Progress 
                      value={((generationStep + 1) / generationSteps.length) * 100} 
                      className="h-2"
                    />
                    <div className="flex flex-col sm:flex-row justify-between text-sm text-muted-foreground gap-2 text-center sm:text-left">
                      <span>Step {generationStep + 1} of {generationSteps.length}</span>
                      <span>Time elapsed: {elapsedSeconds}s</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center mt-4 px-4">
                    This process typically takes 30-45 seconds to complete.
                    We're using AI to carefully analyze all feedback and generate comprehensive insights.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 border border-primary/20 rounded-lg p-4 sm:p-6 bg-primary/5">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                {feedbackRequest?.feedback?.length ? (
                  <>
                    <h3 className="text-base font-semibold">Ready to Generate Report</h3>
                    <p className="text-muted-foreground text-sm px-2">
                      {feedbackRequest.feedback.length} {feedbackRequest.feedback.length === 1 ? 'review' : 'reviews'} collected. 
                      Click below to generate an AI-powered analysis of the feedback.
                    </p>
                    <Button
                      size="default"
                      onClick={handleGenerateReport}
                      disabled={isButtonLoading}
                      className="mt-2 w-full sm:w-auto"
                    >
                      {isButtonLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Preparing report...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>Generate Report</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold">Waiting for Reviews</h3>
                    <p className="text-muted-foreground text-sm px-2">
                      No reviews have been submitted yet. The AI report will be available once feedback is collected.
                    </p>
                    <Button
                      size="default"
                      disabled
                      className="mt-2 w-full sm:w-auto"
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