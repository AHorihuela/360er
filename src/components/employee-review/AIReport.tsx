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

export function AIReport({ feedbackRequest, onExportPDF, onReportChange }: Props) {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<{ content: string; created_at: string; } | null>(() => {
    // Initialize with existing report if available
    const existingReport = feedbackRequest.ai_reports?.[0];
    return existingReport ? {
      content: existingReport.content,
      created_at: existingReport.updated_at
    } : null;
  });
  const [generationStep, setGenerationStep] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
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

  async function handleGenerateReport() {
    if (!feedbackRequest?.id || !feedbackRequest.feedback?.length) return;

    setIsGeneratingReport(true);
    setGenerationStep(0);
    setStartTime(Date.now());

    let reportId: string | null = null;
    let stepInterval: NodeJS.Timeout = setInterval(() => {}, 0);

    try {
      // Check for existing report first
      const { data: existingReport, error: fetchError } = await supabase
        .from('ai_reports')
        .select('id')
        .eq('feedback_request_id', feedbackRequest.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingReport) {
        // Update existing report
        const { data: updatedReport, error: updateError } = await supabase
          .from('ai_reports')
          .update({
            status: 'processing',
            is_final: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        reportId = updatedReport?.id;
      } else {
        // Create new report
        const { data: newReport, error: insertError } = await supabase
          .from('ai_reports')
          .insert({
            feedback_request_id: feedbackRequest.id,
            status: 'processing',
            is_final: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        reportId = newReport?.id;
      }

      // Start step progression
      let currentStep = 0;
      stepInterval = setInterval(() => {
        if (currentStep < generationSteps.length - 1) {
          currentStep++;
          setGenerationStep(currentStep);
        }
      }, 3000);

      console.log('Calling OpenAI to generate report...');
      const reportContent = await generateAIReport(
        feedbackRequest.employee?.name || 'Unknown Employee',
        feedbackRequest.employee?.role || 'Unknown Role',
        feedbackRequest.feedback || []
      );

      if (!reportContent) {
        throw new Error('Failed to generate report content');
      }

      console.log('Report generated:', reportContent.substring(0, 100) + '...');
      clearInterval(stepInterval);
      
      // Force a re-render by creating a new string
      const formattedReport = reportContent.trim();
      setAiReport({
        content: formattedReport,
        created_at: new Date().toISOString()
      });
      console.log('Set AI report in state');

      console.log('Updating report in Supabase...');
      const { error: finalizeError } = await supabase
        .from('ai_reports')
        .update({
          content: formattedReport,
          status: 'completed',
          is_final: true,
          updated_at: new Date().toISOString()
        })
        .eq('feedback_request_id', feedbackRequest.id);

      if (finalizeError) throw finalizeError;

      console.log('Report generation completed successfully');
      toast({
        title: "Success",
        description: "AI report generated successfully",
      });
    } catch (error: unknown) {
      clearInterval(stepInterval);
      console.error('Error generating report:', error);
      
      // Update report with error if we have a report ID
      if (reportId) {
        await supabase
          .from('ai_reports')
          .update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            is_final: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId);
      }

      toast({
        title: "Error",
        description: "Failed to generate AI report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
      setGenerationStep(0);
      setStartTime(null);
    }
  }

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
          <CardContent className="space-y-4 pt-0">
            {aiReport ? (
              <Card>
                <CardHeader className="border-b p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="flex-1 sm:flex-initial"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <MarkdownEditor
                      value={aiReport.content}
                      onChange={(value) => {
                        handleReportChange(value);
                        onReportChange?.(value);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : isGeneratingReport ? (
              <Card>
                <CardContent className="p-4">
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
                </CardContent>
              </Card>
            ) : (
              <div className="text-center space-y-3 border border-primary/20 rounded-lg p-4 sm:p-6 bg-primary/5">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold">Generate AI-Powered Feedback Report</h3>
                <p className="text-muted-foreground text-sm px-2">
                  Create a comprehensive report that analyzes all feedback responses, identifies key themes, and provides actionable insights.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="default"
                    onClick={handleGenerateReport}
                    disabled={!feedbackRequest?.feedback?.length || isGeneratingReport}
                    className="mt-2 w-full sm:w-auto"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  
                  {isGeneratingReport && (
                    <div className="w-full max-w-sm space-y-2 px-4">
                      <Progress 
                        value={((generationStep + 1) / generationSteps.length) * 100} 
                        className="h-1.5"
                      />
                      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-2">
                        <span>{generationSteps[generationStep]}</span>
                        <span>Step {generationStep + 1}/{generationSteps.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
} 