import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, FileText, Loader2, Trash2, ChevronDown, Copy, Sparkles, RefreshCw, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MarkdownEditor } from '@/components/feedback/MarkdownEditor';
import { ReviewCycle } from '@/types/review';
import { FeedbackRequest, FeedbackResponse } from '@/types/feedback';
import { generateAIReport } from '@/lib/openai';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';
import { FeedbackAnalytics } from '@/components/employee-review/FeedbackAnalytics';

interface PageStats {
  responses: number;
  page_views: number;
}

interface AIReport {
  content: string;
  created_at: string;
}

export function EmployeeReviewDetailsPage() {
  const { cycleId, employeeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

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

  const generationSteps = [
    "Analyzing feedback responses...",
    "Identifying key themes and patterns...",
    "Generating comprehensive insights...",
    "Preparing final report..."
  ];

  function getElapsedTime(startTime: number | null) {
    if (!startTime) return '0s';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return `${elapsed}s`;
  }

  // Format timestamp
  function formatLastAnalyzed(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  }

  useEffect(() => {
    fetchData();
  }, [cycleId, employeeId]);

  async function fetchData() {
    if (!cycleId || !employeeId) return;

    try {
      setIsLoading(true);

      // Fetch review cycle and feedback request data
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
              areas_for_improvement
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
        setAiReport(request.ai_reports[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  async function handleDeleteFeedback(feedbackId: string) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    setDeletingFeedbackId(feedbackId);
    try {
      const { error } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      // Update local state
      if (feedbackRequest) {
        const updatedFeedback = feedbackRequest.feedback?.filter(f => f.id !== feedbackId) || [];
        setFeedbackRequest({
          ...feedbackRequest,
          feedback: updatedFeedback,
          _count: {
            responses: updatedFeedback.length,
            page_views: 0,
            unique_viewers: 0
          }
        });
      }

      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    } finally {
      setDeletingFeedbackId(null);
    }
  }

  async function handleGenerateReport() {
    if (!feedbackRequest || !feedbackRequest.feedback?.length) return;
    
    setIsGeneratingReport(true);
    setGenerationStep(0);
    setStartTime(Date.now());
    // Expand the Report panel if not already expanded
    setIsReportOpen(true);
    let reportId: string | null = null;
    
    // Start step progression
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < generationSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 8000); // Change step every 8 seconds
    
    try {
      console.log('Checking for existing report...');
      const { data: existingReport } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('feedback_request_id', feedbackRequest.id)
        .single();

      if (existingReport) {
        console.log('Updating existing report...');
        reportId = existingReport.id;
        const { error: updateError } = await supabase
          .from('ai_reports')
          .update({
            status: 'processing',
            is_final: false,
            error: null,
            content: null, // Clear content while processing
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id);

        if (updateError) throw updateError;
      } else {
        console.log('Creating new report...');
        const { data: newReport, error: insertError } = await supabase
          .from('ai_reports')
          .insert({
            feedback_request_id: feedbackRequest.id,
            status: 'processing',
            is_final: false,
            content: null // Explicitly set content as null while processing
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newReport) reportId = newReport.id;
      }

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

  // Add debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (!feedbackRequest) return;
      
      try {
        // Only clean up extra hashes while preserving heading structure
        const cleanContent = content
          .replace(/^(#{1,6})\s*(.+?)(?:\s*#*\s*)$/gm, '$1 $2') // Clean up only extra hashes while preserving heading level
          .trim();

        const { error } = await supabase
          .from('ai_reports')
          .update({
            content: cleanContent,
            updated_at: new Date().toISOString()
          })
          .eq('feedback_request_id', feedbackRequest.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving report:', error);
        toast({
          title: "Error",
          description: "Failed to save report changes",
          variant: "destructive",
        });
      }
    }, 1000),
    [feedbackRequest]
  );

  // Update the onChange handler for the MarkdownEditor
  function handleReportChange(value: string) {
    // Clean up markdown formatting while preserving line breaks between sections
    const cleanValue = value
      .replace(/^(#{1,6})\s*(.+?)(?:\s*#*\s*)$/gm, '$1 $2\n') // Add newline after headings
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .trim();
    
    setAiReport(prev => ({
      content: cleanValue,
      created_at: prev?.created_at || new Date().toISOString()
    }));
    debouncedSave(cleanValue);
  }

  // Add interval for real-time elapsed time updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && isGeneratingReport) {
      interval = setInterval(() => {
        // Force re-render to update elapsed time
        setStartTime(prev => prev);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startTime, isGeneratingReport]);

  async function handleExportPDF() {
    if (!aiReport?.content) return;

    // Import required modules
    const [html2pdf, { marked }] = await Promise.all([
      import('html2pdf.js'),
      import('marked')
    ]);
    
    // Create a temporary div to render the markdown
    const tempDiv = document.createElement('div');
    tempDiv.className = 'prose prose-gray dark:prose-invert max-w-none p-8';
    
    // Convert markdown to HTML with specific options
    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Clean up the markdown content to ensure proper list formatting
    const cleanedContent = aiReport.content
      .replace(/^[-*+]\s+/gm, '• ') // Convert all list markers to bullet points
      .replace(/^(\d+)\.\s+/gm, (_, num) => `${num}. `); // Preserve numbered lists with proper formatting
    
    const htmlContent = marked.parse(cleanedContent);
    if (typeof htmlContent === 'string') {
      tempDiv.innerHTML = htmlContent;
    }
    
    // Add custom styles for PDF
    const style = document.createElement('style');
    style.textContent = `
      @page {
        margin: 1in;
        size: letter;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #111827;
      }
      h1 { 
        font-size: 24px; 
        margin-bottom: 16px; 
        font-weight: bold;
        page-break-after: avoid;
      }
      h2 { 
        font-size: 20px; 
        margin: 24px 0 12px 0; 
        font-weight: bold;
        page-break-after: avoid;
      }
      h3 { 
        font-size: 16px; 
        margin: 16px 0 8px 0; 
        font-weight: bold;
        page-break-after: avoid;
      }
      p { 
        margin: 0 0 12px 0;
        line-height: 1.6;
        orphans: 3;
        widows: 3;
      }
      ul, ol { 
        margin: 0 0 12px 0;
        padding-left: 24px;
        page-break-inside: avoid;
      }
      li { 
        margin: 0 0 6px 0;
        line-height: 1.6;
      }
      strong { 
        font-weight: 600;
      }
      /* Bullet points styling */
      ul { 
        list-style-type: disc;
        margin-left: 0;
      }
      ul li {
        padding-left: 8px;
      }
      ul li::marker { 
        content: "•";
        font-size: 1.2em;
        color: #111827;
      }
      /* Numbered list styling */
      ol {
        list-style-type: decimal;
        margin-left: 0;
      }
      ol li {
        padding-left: 8px;
      }
      /* Preserve bold text */
      strong, b { 
        font-weight: 600 !important;
      }
    `;
    tempDiv.appendChild(style);
    document.body.appendChild(tempDiv);

    const opt = {
      margin: 0, // We're handling margins in CSS
      filename: `${feedbackRequest?.employee?.name || 'Employee'}_Feedback_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true,
        hotfixes: ['px_scaling']
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: ['#page-break-before'],
        after: ['#page-break-after'],
        avoid: ['li', 'img']
      }
    };

    try {
      await html2pdf.default().set(opt).from(tempDiv).save();
    } finally {
      document.body.removeChild(tempDiv);
    }
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
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('ai-report')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-8 text-xs"
          >
            AI Report
          </Button>
          <Button
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
        <div className="space-y-4">
          <FeedbackAnalytics
            feedbackResponses={feedbackRequest.feedback}
            employeeName={feedbackRequest.employee?.name || ''}
            employeeRole={feedbackRequest.employee?.role || ''}
            feedbackRequestId={feedbackRequest.id}
          />
        </div>
      )}

      {/* Report Section */}
      <div id="ai-report" className="space-y-4">
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
                          onClick={handleExportPDF}
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
                        onChange={handleReportChange}
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
                  {!feedbackRequest?.feedback?.length && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Waiting for feedback responses before a report can be generated
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Detailed Reviews Section */}
      <div id="detailed-feedback" className="space-y-4">
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
                      {feedbackRequest?._count?.responses || 0} of {feedbackRequest?.target_responses || 0} responses
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {(feedbackRequest?.status || 'pending').replace('_', ' ')}
                  </Badge>
                </div>
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
                {feedbackRequest?.feedback?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No feedback responses yet.
                  </div>
                ) : (
                  <div className="divide-y">
                    {feedbackRequest?.feedback?.map((feedback) => (
                      <div key={feedback.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {feedback.relationship.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(feedback.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                            disabled={deletingFeedbackId === feedback.id}
                            className="h-7 px-2 text-destructive hover:text-destructive-foreground"
                          >
                            {deletingFeedbackId === feedback.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Strengths: </span>
                            <span className="text-muted-foreground">{feedback.strengths}</span>
                          </div>
                          <div>
                            <span className="font-medium">Areas for Improvement: </span>
                            <span className="text-muted-foreground">{feedback.areas_for_improvement}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 