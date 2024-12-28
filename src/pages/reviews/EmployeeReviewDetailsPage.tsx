import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, FileText, Loader2, Trash2, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MarkdownEditor } from '@/components/feedback/MarkdownEditor';
import { ReviewCycle, FeedbackRequest } from '@/types/review';
import { generateAIReport } from '@/lib/openai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function EmployeeReviewDetailsPage() {
  const { cycleId, employeeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [generationStep, setGenerationStep] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  const generationSteps = [
    "Analyzing feedback responses...",
    "Identifying key themes and patterns...",
    "Generating comprehensive insights...",
    "Preparing final report..."
  ];

  function getElapsedTime() {
    if (!startTime) return '0s';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return `${elapsed}s`;
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
        setAiReport(request.ai_reports[0].content);
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

    console.log('Starting report generation...');
    setIsGeneratingReport(true);
    setGenerationStep(0);
    setStartTime(Date.now());
    
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
        const { error: updateError } = await supabase
          .from('ai_reports')
          .update({
            status: 'processing',
            is_final: false,
            error: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id);

        if (updateError) throw updateError;
      } else {
        console.log('Creating new report...');
        const { error: insertError } = await supabase
          .from('ai_reports')
          .insert({
            feedback_request_id: feedbackRequest.id,
            status: 'processing',
            is_final: false
          });

        if (insertError) throw insertError;
      }

      console.log('Calling OpenAI to generate report...');
      const reportContent = await generateAIReport(
        feedbackRequest.employee?.name || 'Unknown Employee',
        feedbackRequest.employee?.role || 'Unknown Role',
        feedbackRequest.feedback
      );

      console.log('Report generated:', reportContent.substring(0, 100) + '...');
      clearInterval(stepInterval);
      
      // Force a re-render by creating a new string
      const formattedReport = reportContent.trim();
      setAiReport(formattedReport);
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
      toast({
        title: "Error",
        description: "Failed to generate AI report",
        variant: "destructive",
      });

      // Update report with error
      await supabase
        .from('ai_reports')
        .update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('feedback_request_id', feedbackRequest.id);
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingReport(false);
      setGenerationStep(0);
      setStartTime(null);
    }
  }

  async function handleExportPDF() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    try {
      const canvas = await html2canvas(reportContent);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${feedbackRequest?.employee?.name}_360_Report.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export report as PDF",
        variant: "destructive",
      });
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

  const completionPercentage = Math.round(
    ((feedbackRequest._count?.responses || 0) / (feedbackRequest.target_responses || 1)) * 100
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/reviews/${cycleId}`)}
            className="hover:bg-gradient-to-r hover:from-[#F87315] hover:to-[#F83A15] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review Cycle
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{feedbackRequest.employee?.name}</h1>
            <p className="text-muted-foreground">{feedbackRequest.employee?.role}</p>
          </div>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || !feedbackRequest.feedback?.length}
          className="hover:bg-gradient-to-r hover:from-[#F87315] hover:to-[#F83A15] hover:text-white"
          variant="outline"
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              {aiReport ? 'Re-Generate Report' : 'Generate Report'}
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Report</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isGeneratingReport || !aiReport}
                className="hover:bg-gradient-to-r hover:from-[#F87315] hover:to-[#F83A15] hover:text-white"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-gradient-to-r hover:from-[#F87315] hover:to-[#F83A15] hover:text-white"
                onClick={() => setIsReportExpanded(!isReportExpanded)}
              >
                {isReportExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isReportExpanded && (
            <CardContent>
              {isGeneratingReport ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-12">
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-primary">
                        {generationSteps[generationStep]}
                      </p>
                    </div>
                    
                    <div className="w-full space-y-2">
                      <Progress 
                        value={((generationStep + 1) / generationSteps.length) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Step {generationStep + 1} of {generationSteps.length}</span>
                        <span>Time elapsed: {getElapsedTime()}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground text-center mt-4">
                      This process typically takes 30-45 seconds to complete.
                      We're using AI to carefully analyze all feedback and generate comprehensive insights.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiReport ? (
                    <div id="report-content">
                      <MarkdownEditor
                        value={aiReport}
                        onChange={(value) => setAiReport(value)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">
                        Generate a report to get comprehensive insights from all feedback responses.
                      </p>
                      <Button
                        onClick={handleGenerateReport}
                        disabled={!feedbackRequest?.feedback?.length}
                      >
                        Generate Report
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Review Cycle
                  </p>
                  <p className="text-sm font-medium">{reviewCycle.name}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Started: {reviewCycle.start_date ? new Date(reviewCycle.start_date).toLocaleDateString() : 'Not set'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Deadline: {reviewCycle.end_date ? new Date(reviewCycle.end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Completion
                  </p>
                  <div className="flex items-center gap-2">
                    <Progress value={completionPercentage} className="h-2" />
                    <span className="text-sm font-medium">{completionPercentage}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feedbackRequest._count?.responses || 0} of {feedbackRequest.target_responses} responses
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </p>
                  <Badge 
                    variant={reviewCycle.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {reviewCycle.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Feedback Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackRequest.feedback?.length ? (
                <div className="space-y-4">
                  {feedbackRequest.feedback.map((feedback) => (
                    <div key={feedback.id} className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {feedback.relationship.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(feedback.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFeedback(feedback.id)}
                          disabled={deletingFeedbackId === feedback.id}
                          className="h-8 w-8 p-0 hover:bg-gradient-to-r hover:from-[#F87315] hover:to-[#F83A15] hover:text-white"
                        >
                          {deletingFeedbackId === feedback.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {feedback.strengths && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                          <p className="text-sm">{feedback.strengths}</p>
                        </div>
                      )}
                      {feedback.areas_for_improvement && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Areas for Improvement
                          </p>
                          <p className="text-sm">{feedback.areas_for_improvement}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No feedback received yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 