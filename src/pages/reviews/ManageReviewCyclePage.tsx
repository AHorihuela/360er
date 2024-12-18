import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Plus, Trash2, Loader2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ReviewCycle, FeedbackRequest, FeedbackResponse } from '@/types/review';
import { Progress } from '@/components/ui/progress';

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
          )
        `)
        .eq('review_cycle_id', cycleId)
        .eq('employee.user_id', user.id);

      if (error) throw error;

      const typedRequests: FeedbackRequest[] = (requests || []).map(request => {
        const employeeData = Array.isArray(request.employee) ? request.employee[0] : request.employee;
        
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
          feedback: (request.feedback || []) as FeedbackResponse[]
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

  function getStatusBadgeVariant(request: FeedbackRequest): string {
    return getCompletionStatus(request) ? 'default' : 'secondary';
  }

  function getStatusText(request: FeedbackRequest): string {
    return getCompletionStatus(request) ? 'Completed' : 'Pending';
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
                                  {feedback.relationship.replace('_', ' ')}
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