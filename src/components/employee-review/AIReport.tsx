import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, RefreshCw, FileDown, ChevronDown } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { generateAIReport } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FeedbackResponse } from '@/types/feedback';
import { MarkdownEditor } from '@/components/feedback/MarkdownEditor';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from 'lodash';

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
}

const generationSteps = [
  "Analyzing feedback responses...",
  "Identifying key themes and patterns...",
  "Evaluating performance metrics...",
  "Generating comprehensive insights...",
  "Finalizing report..."
];

function getElapsedTime(startTime: number | null): string {
  if (!startTime) return '0s';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return `${elapsed}s`;
}

export function AIReport({ 
  feedbackRequest, 
  onExportPDF, 
  onReportChange,
  onGenerateReport,
  isGeneratingReport,
  generationStep,
  startTime
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
  const [isReportOpen, setIsReportOpen] = useState(false);

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

    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report changes",
        variant: "destructive",
      });
    }
  }, 1000);

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
          onClick={() => setIsReportOpen(!isReportOpen)}
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
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div className="space-y-1">
                    <CardTitle>AI-Generated Feedback Report</CardTitle>
                    <CardDescription>
                      {aiReport?.created_at ? `Generated ${new Date(aiReport.created_at).toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}` : 'Recently generated'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onExportPDF}
                      disabled={isGeneratingReport}
                      className="flex-1 sm:flex-initial"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onGenerateReport}
                      disabled={isGeneratingReport || !feedbackRequest?.feedback?.length}
                      className="flex-1 sm:flex-initial whitespace-nowrap"
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {generationSteps[generationStep]} ({getElapsedTime(startTime)})
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="w-full">
                  <MarkdownEditor
                    value={aiReport.content}
                    onChange={(value) => {
                      handleReportChange(value);
                      onReportChange?.(value);
                    }}
                  />
                </div>
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
                      <span>Time elapsed: {getElapsedTime(startTime)}</span>
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
                <h3 className="text-base font-semibold">Generate AI-Powered Feedback Report</h3>
                <p className="text-muted-foreground text-sm px-2">
                  Create a comprehensive report that analyzes all feedback responses, identifies key themes, and provides actionable insights.
                </p>
                <Button
                  size="default"
                  onClick={onGenerateReport}
                  disabled={!feedbackRequest?.feedback?.length || isGeneratingReport}
                  className="mt-2 w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
} 