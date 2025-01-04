import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Trash2, Copy, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FeedbackRequest } from '@/types/feedback';
import { ReviewCycle } from '@/types/review';
import { generateAIReport } from '@/lib/openai';
import { debounce } from 'lodash';
import { FeedbackAnalytics } from '@/components/employee-review/FeedbackAnalytics';
import { AIReport } from '@/components/employee-review/AIReport';

// Types for report generation steps and progress
export type GenerationStep = 0 | 1 | 2 | 3;
export type GenerationSteps = readonly [string, string, string, string];

// Generation steps for the UI progress display
export const GENERATION_STEPS = [
  "Analyzing feedback responses...",
  "Identifying key themes and patterns...",
  "Generating comprehensive insights...",
  "Preparing final report..."
] as const;

// Utility functions for report generation
export function getElapsedTime(startTime: number | null): string {
  if (!startTime) return '0s';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return `${elapsed}s`;
}

export function formatLastAnalyzed(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

// Interface for AI Report
interface AIReportType {
  content: string;
  created_at: string;
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
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<AIReportType | null>(null);
  
  // Report generation progress tracking
  const [generationStep, setGenerationStep] = useState<GenerationStep>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  // Utility functions for report generation
  const getNextStep = (current: GenerationStep): GenerationStep => {
    switch (current) {
      case 0: return 1;
      case 1: return 2;
      case 2: return 3;
      case 3: return 3;
      default: return current;
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

  useEffect(() => {
    fetchData();
  }, [cycleId, employeeId]);

  async function fetchData() {
    if (!cycleId || !employeeId) return;

    try {
      setIsLoading(true);
      setError(null); // Reset error state before fetching

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
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load employee review details'); // Set error message
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
    if (!feedbackRequest) return;
    
    setDeletingFeedbackId(feedbackId);
    
    try {
      // First, update any feedback responses that reference this one
      const { error: updateError } = await supabase
        .from('feedback_responses')
        .update({ previous_version_id: null })
        .eq('previous_version_id', feedbackId);

      if (updateError) {
        console.error('Error updating references:', updateError);
      }

      // Then delete the feedback
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
    let reportId: string | null = null;
    
    // Start step progression with type-safe step updates
    const stepInterval = setInterval(() => {
      setGenerationStep(currentStep => getNextStep(currentStep));
    }, 8000);
    
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
    } catch (err) {
      clearInterval(stepInterval);
      setError('Failed to generate AI report');
      console.error('Error generating report:', err);
      
      // Update report with error if we have a report ID
      if (reportId) {
        await supabase
          .from('ai_reports')
          .update({
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error occurred',
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

        const { error: saveError } = await supabase
          .from('ai_reports')
          .update({
            content: cleanContent,
            updated_at: new Date().toISOString()
          })
          .eq('feedback_request_id', feedbackRequest.id);

        if (saveError) {
          setError('Failed to save report changes');
          throw saveError;
        }
      } catch (err) {
        console.error('Error saving report:', err);
        toast({
          title: "Error",
          description: "Failed to save report changes",
          variant: "destructive",
        });
      }
    }, 1000),
    [feedbackRequest, toast, setError]
  );

  /** 
   * Handles changes to the AI report content and saves them to the database.
   * Used by the MarkdownEditor component in AIReport.tsx.
   */
  const handleReportChange = useCallback((value: string) => {
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
  }, [debouncedSave]);

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

  const handleDeleteClick = (feedbackId: string) => {
    setFeedbackToDelete(feedbackId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (feedbackToDelete) {
      await handleDeleteFeedback(feedbackToDelete);
      setIsDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setFeedbackToDelete(null);
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
        <section className="space-y-4 pb-6">
          <FeedbackAnalytics
            feedbackResponses={feedbackRequest.feedback}
            employeeName={feedbackRequest.employee?.name || ''}
            employeeRole={feedbackRequest.employee?.role || ''}
            feedbackRequestId={feedbackRequest.id}
          />
        </section>
      )}

      {/* Report Section */}
      <section id="ai-report" className="space-y-4 py-6">
        <AIReport 
          feedbackRequest={feedbackRequest}
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
                    {feedbackRequest?.feedback
                      ?.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                      ?.map((feedback) => (
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
                            disabled={deletingFeedbackId === feedback.id}
                            onClick={() => handleDeleteClick(feedback.id)}
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
      </section>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogPortal>
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
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  );
} 