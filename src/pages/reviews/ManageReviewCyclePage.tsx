import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Trash2, Loader2, UserPlus, ChevronDown, ChevronUp, Wand2, X, Download, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ReviewCycle, FeedbackRequest, FeedbackResponse, REQUEST_STATUS } from '@/types/review';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { generateAIReport } from '@/lib/openai';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

export function ManageReviewCyclePage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string; }[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [selectedRequestForReport, setSelectedRequestForReport] = useState<string | null>(null);
  const [openDialogs, setOpenDialogs] = useState<Set<string>>(new Set());

  // Add role priority mapping
  const rolePriority: { [key: string]: number } = {
    'EVP': 1,
    'SVP': 2,
    'VP': 3
  };

  // Sort function for feedback requests
  function sortFeedbackRequests(requests: FeedbackRequest[]): FeedbackRequest[] {
    return [...requests].sort((a, b) => {
      // First sort by role priority
      const rolePriorityA = rolePriority[a.employee?.role || ''] || 999;
      const rolePriorityB = rolePriority[b.employee?.role || ''] || 999;
      
      if (rolePriorityA !== rolePriorityB) {
        return rolePriorityA - rolePriorityB;
      }
      
      // Then sort by name
      return (a.employee?.name || '').localeCompare(b.employee?.name || '');
    });
  }

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        navigate('/login');
        return;
      }

      // Fetch review cycle details
      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', cycleId)
        .eq('user_id', user.id)
        .single();

      if (cycleError) throw cycleError;
      setReviewCycle(cycleData);

      // Fetch all employees for the current user
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData);

      // Fetch existing feedback requests with feedback
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          unique_link,
          status,
          created_at,
          target_responses,
          manually_completed,
          employee:employees!inner (
            id,
            name,
            role
          ),
          feedback:feedback_responses (
            id,
            relationship,
            overall_rating,
            strengths,
            areas_for_improvement,
            submitted_at
          ),
          ai_reports (
            id,
            content,
            is_final,
            updated_at
          )
        `)
        .eq('review_cycle_id', cycleId)
        .eq('employee.user_id', user.id);

      if (error) throw error;

      const typedRequests: FeedbackRequest[] = (requests || []).map(request => {
        const employeeData = Array.isArray(request.employee) ? request.employee[0] : request.employee;
        const aiReport = request.ai_reports?.length > 0 ? request.ai_reports[0] : null;
        
        return {
          id: request.id,
          review_cycle_id: request.review_cycle_id,
          employee_id: request.employee_id,
          unique_link: request.unique_link,
          status: request.status as 'pending' | 'completed',
          created_at: request.created_at,
          target_responses: request.target_responses || 3,
          manually_completed: request.manually_completed || false,
          employee: {
            id: employeeData?.id || '',
            name: employeeData?.name || '',
            role: employeeData?.role || ''
          },
          feedback: (request.feedback || []) as FeedbackResponse[],
          ai_report: aiReport ? {
            id: aiReport.id,
            feedback_request_id: request.id,
            content: aiReport.content,
            created_at: request.created_at,
            updated_at: aiReport.updated_at,
            is_final: aiReport.is_final
          } : undefined
        };
      });

      // Apply sorting before setting state
      setFeedbackRequests(sortFeedbackRequests(typedRequests));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddEmployees() {
    if (selectedEmployeeIds.size === 0) return;

    setIsAddingEmployees(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create feedback requests for all selected employees
      const feedbackRequestsToAdd = Array.from(selectedEmployeeIds).map(employeeId => ({
        review_cycle_id: cycleId,
        employee_id: employeeId,
        unique_link: crypto.randomUUID(),
        status: 'pending'
      }));

      const { data, error } = await supabase
        .from('feedback_requests')
        .insert(feedbackRequestsToAdd)
        .select('*, employee:employees(*)')

      if (error) throw error;

      setFeedbackRequests([...feedbackRequests, ...data]);
      setSelectedEmployeeIds(new Set());
      toast({
        title: "Employees Added",
        description: `Successfully added ${data.length} employee(s) to the review cycle.`,
      });
    } catch (error) {
      console.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "Failed to add employees to review cycle",
        variant: "destructive",
      });
    } finally {
      setIsAddingEmployees(false);
    }
  }

  function handleEmployeeToggle(employeeId: string) {
    const newSelectedIds = new Set(selectedEmployeeIds);
    if (newSelectedIds.has(employeeId)) {
      newSelectedIds.delete(employeeId);
    } else {
      newSelectedIds.add(employeeId);
    }
    setSelectedEmployeeIds(newSelectedIds);
  }

  async function handleCopyLink(uniqueLink: string) {
    const feedbackUrl = `${window.location.origin}/feedback/${uniqueLink}`;
    await navigator.clipboard.writeText(feedbackUrl);
    toast({
      title: "Link Copied",
      description: "Feedback link has been copied to clipboard",
    });
  }

  async function handleDeleteFeedback(feedbackId: string) {
    if (deletingFeedbackId) return; // Prevent multiple deletes
    
    try {
      setDeletingFeedbackId(feedbackId);
      console.log('Starting delete operation for feedback:', feedbackId);
      
      const { error: deleteError } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(`Failed to delete feedback: ${deleteError.message}`);
      }

      // Verify the deletion
      const { data: checkData, error: checkError } = await supabase
        .from('feedback_responses')
        .select('id')
        .eq('id', feedbackId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Delete verified - feedback no longer exists');
      } else if (checkData) {
        throw new Error('Delete operation failed - feedback still exists');
      }

      // Update the local state to reflect the deletion
      setFeedbackRequests(feedbackRequests.map(request => ({
        ...request,
        feedback: request.feedback?.filter(f => f.id !== feedbackId) || []
      })));

      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    } catch (error) {
      console.error('Delete operation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingFeedbackId(null);
    }
  }

  function toggleFeedback(requestId: string) {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  }

  async function handleUpdateTargetResponses(requestId: string, newTarget: number) {
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ target_responses: newTarget })
        .eq('id', requestId);

      if (error) throw error;

      setFeedbackRequests(feedbackRequests.map(request => 
        request.id === requestId 
          ? { ...request, target_responses: newTarget }
          : request
      ));

      toast({
        title: "Updated",
        description: "Target responses updated successfully",
      });
    } catch (error) {
      console.error('Error updating target responses:', error);
      toast({
        title: "Error",
        description: "Failed to update target responses",
        variant: "destructive",
      });
    }
  }

  async function handleRemoveEmployee(requestId: string) {
    if (removingEmployeeId) return;
    
    try {
      setRemovingEmployeeId(requestId);
      
      // First verify the feedback request exists
      const { data: request, error: verifyError } = await supabase
        .from('feedback_requests')
        .select('id')
        .eq('id', requestId)
        .single();

      if (verifyError || !request) {
        throw new Error('Feedback request not found');
      }

      // Delete all feedback responses first
      const { error: feedbackError } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('feedback_request_id', requestId);

      if (feedbackError) {
        console.error('Error deleting feedback responses:', feedbackError);
        throw feedbackError;
      }

      // Then delete the feedback request
      const { error: requestError } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('id', requestId);

      if (requestError) {
        console.error('Error deleting feedback request:', requestError);
        throw requestError;
      }

      // Update local state
      const updatedRequests = feedbackRequests.filter(req => req.id !== requestId);
      setFeedbackRequests(sortFeedbackRequests(updatedRequests));

      toast({
        title: "Employee Removed",
        description: "Employee has been removed from the review cycle",
      });
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "Failed to remove employee from review cycle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingEmployeeId(null);
    }
  }

  function getCompletionStatus(request: FeedbackRequest): boolean {
    return (request.feedback?.length || 0) >= (request.target_responses || 3);
  }

  function getStatusBadgeVariant(request: FeedbackRequest): "default" | "destructive" | "outline" | "secondary" {
    if (request.status === REQUEST_STATUS.COMPLETED || request.status === REQUEST_STATUS.EXCEEDED) {
      return "default";
    }
    if (request.status === REQUEST_STATUS.PENDING) {
      return "secondary";
    }
    return "outline";
  }

  function getStatusText(request: FeedbackRequest): string {
    return getCompletionStatus(request) ? 'Completed' : 'Pending';
  }

  async function handleGenerateAIReport(feedbackRequest: FeedbackRequest) {
    if (!feedbackRequest.feedback?.length) {
      toast({
        title: "No Feedback Available",
        description: "There must be at least one feedback response to generate a report.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingReport(true);
    setSelectedRequestForReport(feedbackRequest.id);
    setAiReport(''); // Clear any existing report
    
    try {
      // Generate the AI report
      const report = await generateAIReport(
        feedbackRequest.employee?.name || 'Unknown Employee',
        feedbackRequest.employee?.role || 'Unknown Role',
        feedbackRequest.feedback
      );
      
      // Save the report to Supabase
      const { data: savedReport, error: saveError } = await supabase
        .from('ai_reports')
        .insert([{
          feedback_request_id: feedbackRequest.id,
          content: report,
          is_final: false
        }])
        .select()
        .single();

      if (saveError) throw saveError;
      
      // Update the report content to use the current employee's name
      const updatedReport = report.replace(/# [\s\S]*?(?=##)/, `# 360-Degree Feedback Report for ${feedbackRequest.employee?.name}\n\n`);
      setAiReport(updatedReport);
      
      // Update local state to reflect the new report
      setFeedbackRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === feedbackRequest.id
            ? {
                ...req,
                ai_report: {
                  id: savedReport.id,
                  feedback_request_id: feedbackRequest.id,
                  content: updatedReport,
                  created_at: savedReport.created_at,
                  updated_at: savedReport.updated_at,
                  is_final: false
                }
              }
            : req
        )
      );
      
      toast({
        title: "Report Generated",
        description: "AI report has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating AI report:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI report. Please try again.",
        variant: "destructive",
      });
      setOpenDialogs(prev => new Set([...prev, feedbackRequest.id]));
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleSaveReport(requestId: string) {
    if (!aiReport.trim()) {
      toast({
        title: "Error",
        description: "Report content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_reports')
        .update({ 
          content: aiReport,
          is_final: true,
          updated_at: new Date().toISOString()
        })
        .eq('feedback_request_id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report saved successfully.",
      });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleViewReport(request: FeedbackRequest) {
    if (!request.ai_report) return;
    
    try {
      setIsGeneratingReport(false); // Reset any generating state
      setSelectedRequestForReport(request.id);
      setAiReport(request.ai_report.content);
      setOpenDialogs(prev => new Set([...prev, request.id]));
    } catch (error) {
      console.error('Error viewing report:', error);
      toast({
        title: "Error",
        description: "Failed to load the report. Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleCloseDialog(requestId: string) {
    setOpenDialogs(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
    
    // Reset states when closing dialog
    if (selectedRequestForReport === requestId) {
      setSelectedRequestForReport(null);
      setAiReport('');
      setIsGeneratingReport(false);
    }
  }

  async function handleDeleteReport(requestId: string) {
    try {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('feedback_request_id', requestId);

      if (error) throw error;

      // Update local state to remove the report
      setFeedbackRequests(feedbackRequests.map(request => {
        if (request.id === requestId) {
          return { ...request, ai_report: undefined };
        }
        return request;
      }));

      // Close the dialog
      handleCloseDialog(requestId);

      toast({
        title: "Success",
        description: "Report deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Add keyboard shortcut handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && selectedRequestForReport && aiReport.trim()) {
        e.preventDefault();
        handleSaveReport(selectedRequestForReport);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRequestForReport, aiReport]);

  async function handleExportReport(format: 'pdf' | 'text', content: string, employeeName: string) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${employeeName.replace(/\s+/g, '_')}_360_Review_${timestamp}`;

    if (format === 'text') {
      // Export as text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Create a temporary container for the markdown content
      const container = document.createElement('div');
      // Convert markdown to HTML and inject styles
      container.innerHTML = `
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            font-size: 24px;
            color: #111;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            color: #333;
            margin-top: 24px;
            margin-bottom: 16px;
          }
          h3 {
            font-size: 18px;
            color: #444;
            margin-top: 20px;
            margin-bottom: 12px;
          }
          p {
            margin-bottom: 16px;
            font-size: 14px;
          }
          ul, ol {
            margin-bottom: 16px;
            padding-left: 24px;
          }
          li {
            margin-bottom: 8px;
            font-size: 14px;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin: 16px 0;
            color: #666;
            font-style: italic;
          }
          code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
          }
          strong {
            color: #222;
          }
        </style>
        ${marked(content, { breaks: true })}
      `;
      container.style.padding = '40px';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      try {
        // Convert the container to canvas with better quality settings
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          onclone: (clonedDoc) => {
            const clonedContainer = clonedDoc.querySelector('div');
            if (clonedContainer) {
              clonedContainer.style.width = '800px';
              clonedContainer.style.margin = '0 auto';
            }
          }
        });

        // Initialize PDF with better settings
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'a4',
          hotfixes: ['px_scaling']
        });

        // Calculate dimensions to maintain aspect ratio
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Set image width to page width with some margins
        const margins = 40;
        const imageWidth = pageWidth - (margins * 2);
        
        // Calculate total height and number of pages needed
        const totalHeight = canvas.height;
        const pageHeightInPx = (pageHeight - (margins * 2));
        const numberOfPages = Math.ceil(totalHeight / pageHeightInPx);

        // For each page
        for (let page = 0; page < numberOfPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }

          // Calculate the slice of the canvas to use for this page
          const sourceY = page * pageHeightInPx;
          const sliceHeight = Math.min(pageHeightInPx, totalHeight - sourceY);
          
          // Create a temporary canvas for this slice
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = sliceHeight;
          
          // Draw the slice of the original canvas onto the temporary canvas
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, sourceY, canvas.width, sliceHeight, // Source rectangle
              0, 0, canvas.width, sliceHeight        // Destination rectangle
            );
          }

          // Add this slice to the PDF
          pdf.addImage(
            tempCanvas.toDataURL('image/png'),
            'PNG',
            margins,
            margins,
            imageWidth,
            (sliceHeight * imageWidth) / canvas.width,
            '',
            'FAST'
          );
        }

        // Save PDF
        pdf.save(`${filename}.pdf`);
      } finally {
        // Clean up
        document.body.removeChild(container);
      }
    }
  }

  if (isLoading || !reviewCycle) {
    return <div>Loading...</div>;
  }

  const availableEmployees = employees.filter(
    emp => !feedbackRequests.some(req => req.employee_id === emp.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/reviews')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review Cycles
        </Button>
        <h1 className="text-2xl font-bold">{reviewCycle.title}</h1>
      </div>

      {availableEmployees.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Employees to Review</h2>
            <Button 
              onClick={handleAddEmployees} 
              disabled={selectedEmployeeIds.size === 0 || isAddingEmployees}
            >
              {isAddingEmployees ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add Selected ({selectedEmployeeIds.size})
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableEmployees.map(emp => (
              <div
                key={emp.id}
                className={`
                  relative rounded-lg border p-4 transition-colors cursor-pointer
                  ${selectedEmployeeIds.has(emp.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                  }
                `}
                onClick={() => handleEmployeeToggle(emp.id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(emp.id)}
                    onChange={() => handleEmployeeToggle(emp.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <h3 className="font-medium">{emp.name}</h3>
                    <p className="text-sm text-muted-foreground">{emp.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Reviewees</h2>
        </div>
        <div className="divide-y">
          {feedbackRequests.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No employees added to this review cycle yet
            </div>
          ) : (
            feedbackRequests.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="font-medium">{request.employee?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{request.employee?.role || 'No role'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(request.unique_link)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Feedback Link
                    </Button>
                    <Dialog 
                      open={openDialogs.has(request.id)} 
                      onOpenChange={(open) => {
                        if (!open) {
                          handleCloseDialog(request.id);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (request.ai_report) {
                              handleViewReport(request);
                            } else {
                              setOpenDialogs(prev => new Set([...prev, request.id]));
                              handleGenerateAIReport(request);
                            }
                          }}
                          disabled={!request.feedback?.length || isGeneratingReport}
                        >
                          {isGeneratingReport && selectedRequestForReport === request.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Report...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" />
                              {request.ai_report ? 'See AI Report' : 'Generate AI Report'}
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between p-6 border-b">
                            <DialogTitle>
                              {request.ai_report ? 
                                `AI-Generated Review Report for ${request.employee?.name}` : 
                                `Generate AI Review Report for ${request.employee?.name}`
                              }
                            </DialogTitle>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExportReport('text', aiReport, request.employee?.name || 'Unknown')}
                                  title="Export as Text"
                                  disabled={isGeneratingReport || !aiReport.trim()}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExportReport('pdf', aiReport, request.employee?.name || 'Unknown')}
                                  title="Export as PDF"
                                  disabled={isGeneratingReport || !aiReport.trim()}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReport(request.id)}
                                  className="text-destructive hover:bg-destructive/10"
                                  title="Delete Report"
                                  disabled={isGeneratingReport || !aiReport.trim()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCloseDialog(request.id)}
                                className="h-6 w-6 rounded-full"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto px-6 py-4">
                              {isGeneratingReport && selectedRequestForReport === request.id ? (
                                <div className="flex flex-col items-center justify-center space-y-4 h-full">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                  <p className="text-sm text-muted-foreground">
                                    Analyzing feedback and generating report...
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    This may take a few moments
                                  </p>
                                </div>
                              ) : (
                                <RichTextEditor
                                  key={request.id}
                                  content={aiReport}
                                  placeholder={request.ai_report ? 'Loading report...' : 'The AI report will appear here...'}
                                  editable={!isGeneratingReport}
                                  onChange={(content) => setAiReport(content)}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-6 border-t bg-background">
                            <div className="text-sm text-muted-foreground">
                              {request.ai_report && (
                                <span>Last updated: {request.ai_report?.updated_at ? new Date(request.ai_report.updated_at).toLocaleString() : 'Never'}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!isGeneratingReport && (
                                <Button
                                  onClick={() => handleSaveReport(request.id)}
                                  disabled={!aiReport.trim()}
                                >
                                  Save Changes
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEmployee(request.id)}
                      disabled={removingEmployeeId === request.id}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      {removingEmployeeId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {request.feedback?.length ? (
                  <div className="mt-4">
                    <button
                      onClick={() => toggleFeedback(request.id)}
                      className="flex w-full items-center justify-between rounded-md bg-muted/50 px-4 py-2 text-sm font-medium hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          Feedback Received ({request.feedback.length})
                        </h4>
                        <Badge variant={getStatusBadgeVariant(request)}>
                          {getStatusText(request)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Target: 
                          </span>
                          <select
                            value={request.target_responses || 3}
                            onChange={(e) => handleUpdateTargetResponses(request.id, parseInt(e.target.value))}
                            className="bg-transparent border rounded px-1"
                          >
                            {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        {expandedRequests.has(request.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                    
                    <div className="mt-2">
                      <Progress 
                        value={(request.feedback.length / (request.target_responses || 3)) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    {expandedRequests.has(request.id) && (
                      <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {request.feedback.map((feedback) => (
                          <div key={feedback.id} className="rounded-lg border bg-muted/50 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">
                                  {feedback.relationship === 'senior_colleague'
                                    ? `Senior Colleague (I am more senior than ${request.employee?.role})`
                                    : feedback.relationship === 'equal_colleague'
                                    ? `Equal Colleague (I am ${request.employee?.role} or equivalent)`
                                    : `Junior Colleague (I am less senior than ${request.employee?.role})`}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFeedback(feedback.id)}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete feedback"
                                  disabled={deletingFeedbackId === feedback.id}
                                >
                                  {deletingFeedbackId === feedback.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(feedback.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                            {feedback.strengths && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                                <p className="text-sm">{feedback.strengths}</p>
                              </div>
                            )}
                            {feedback.areas_for_improvement && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Areas for Improvement</p>
                                <p className="text-sm">{feedback.areas_for_improvement}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">No feedback received yet</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 