import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Trash2, Loader2, UserPlus, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReviewCycle, FeedbackRequest, REQUEST_STATUS } from '@/types/review';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { CycleAnalytics } from '@/components/review-cycle/CycleAnalytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function determineRequestStatus(request: FeedbackRequest): string {
  if (!request.target_responses) return REQUEST_STATUS.PENDING;
  if (request._count?.responses === 0) return REQUEST_STATUS.PENDING;
  if (request._count?.responses === request.target_responses) return REQUEST_STATUS.COMPLETED;
  if (request._count?.responses && request._count.responses > 0) return REQUEST_STATUS.IN_PROGRESS;
  return REQUEST_STATUS.PENDING;
}

export function ReviewCycleDetailsPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);
  const [showAddEmployeesDialog, setShowAddEmployeesDialog] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{ id: string; name: string; role: string; }>>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '' });
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  async function fetchData() {
    if (!cycleId) return;

    try {
      setIsLoading(true);

      // Fetch review cycle data
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
              relationship
            ),
            analytics:feedback_analytics!feedback_request_id (
              id,
              insights
            )
          )
        `)
        .eq('id', cycleId)
        .single();

      if (cycleError) throw cycleError;

      // Process feedback requests
      const processedRequests = cycleData.feedback_requests.map((request: FeedbackRequest) => {
        const responseCount = request.feedback_responses?.length || 0;
        const status = determineRequestStatus(request);
        return {
          ...request,
          status,
          feedback: request.feedback_responses,
          _count: {
            responses: responseCount
          }
        };
      });

      setReviewCycle(cycleData);
      setFeedbackRequests(processedRequests);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load review cycle details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyLink(uniqueLink: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feedback/${uniqueLink}`);
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
  }

  async function handleRemoveEmployee(requestId: string, employeeName: string) {
    setEmployeeToRemove({ id: requestId, name: employeeName });
    setShowRemoveDialog(true);
  }

  async function confirmRemoveEmployee() {
    if (!employeeToRemove || removingEmployeeId) return;

    setRemovingEmployeeId(employeeToRemove.id);
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('id', employeeToRemove.id);

      if (error) throw error;

      setFeedbackRequests(prev => prev.filter(req => req.id !== employeeToRemove.id));
      toast({
        title: "Success",
        description: "Employee removed from review cycle",
      });
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      });
    } finally {
      setRemovingEmployeeId(null);
      setShowRemoveDialog(false);
      setEmployeeToRemove(null);
    }
  }

  function getStatusBadgeVariant(request: FeedbackRequest) {
    switch (request.status) {
      case REQUEST_STATUS.COMPLETED:
        return 'default';
      case REQUEST_STATUS.IN_PROGRESS:
        return 'secondary';
      case REQUEST_STATUS.PENDING:
        return 'outline';
      case REQUEST_STATUS.EXCEEDED:
        return 'destructive';
      default:
        return 'outline';
    }
  }

  async function fetchAvailableEmployees() {
    setIsFetchingEmployees(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id);

      if (employeesError) throw employeesError;

      // Filter out employees already in the review cycle
      const available = allEmployees.filter(emp => 
        !feedbackRequests.some(req => req.employee_id === emp.id)
      );

      setAvailableEmployees(available || []);
    } catch (error) {
      console.error('Error fetching available employees:', error);
      toast({
        title: "Error",
        description: "Failed to load available employees",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEmployees(false);
    }
  }

  async function handleAddEmployees() {
    if (selectedEmployeeIds.size === 0) return;

    setIsAddingEmployees(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Simple insert without select
      const { error: insertError } = await supabase
        .from('feedback_requests')
        .insert(
          Array.from(selectedEmployeeIds).map(employeeId => ({
            review_cycle_id: cycleId,
            employee_id: employeeId,
            unique_link: crypto.randomUUID(),
            status: 'pending',
            target_responses: 10,
            manually_completed: false
          }))
        );

      if (insertError) throw insertError;

      // Separate select after successful insert
      const { data: newRequests, error: selectError } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          unique_link,
          status,
          target_responses,
          manually_completed,
          created_at,
          updated_at,
          employee:employees!inner (
            id,
            name,
            role,
            user_id
          )
        `)
        .eq('review_cycle_id', cycleId)
        .in('employee_id', Array.from(selectedEmployeeIds))
        .order('created_at', { ascending: false });

      if (selectError) throw selectError;

      setFeedbackRequests(prev => [...prev, ...(newRequests as unknown as FeedbackRequest[] || [])]);
      setSelectedEmployeeIds(new Set());
      setShowAddEmployeesDialog(false);
      toast({
        title: "Success",
        description: `Added ${newRequests?.length || 0} employee(s) to the review cycle`,
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

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.role) return;

    setIsAddingEmployees(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create new employee
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert([{ 
          name: newEmployee.name, 
          role: newEmployee.role,
          user_id: user.id
        }])
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Create feedback request for the new employee
      const { data: requestData, error: requestError } = await supabase
        .from('feedback_requests')
        .insert([{
          review_cycle_id: cycleId,
          employee_id: employeeData.id,
          unique_link: crypto.randomUUID(),
          status: 'pending',
          target_responses: 10
        }])
        .select('*, employee:employees(*)');

      if (requestError) throw requestError;

      setFeedbackRequests(prev => [...prev, ...requestData]);
      setNewEmployee({ name: '', role: '' });
      setShowNewEmployeeForm(false);
      setShowAddEmployeesDialog(false);
      toast({
        title: "Success",
        description: "New employee added to review cycle",
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setIsAddingEmployees(false);
    }
  }

  function toggleEmployeeSelection(employeeId: string) {
    const newSelection = new Set(selectedEmployeeIds);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployeeIds(newSelection);
  }

  useEffect(() => {
    if (showAddEmployeesDialog) {
      fetchAvailableEmployees();
    }
  }, [showAddEmployeesDialog, feedbackRequests]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!reviewCycle) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/reviews')}
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold h-auto py-1 px-2"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('review_cycles')
                        .update({ title: editedTitle })
                        .eq('id', cycleId);

                      if (error) throw error;
                      setReviewCycle(prev => prev ? { ...prev, title: editedTitle } : null);
                      setIsEditingTitle(false);
                    } catch (error) {
                      console.error('Error updating title:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update review cycle title",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(reviewCycle?.title || '');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold">{reviewCycle?.title}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedTitle(reviewCycle?.title || '');
                    setIsEditingTitle(true);
                  }}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Due {new Date(reviewCycle?.review_by_date || '').toLocaleDateString()}</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowAddEmployeesDialog(true)}
          className="w-full sm:w-auto gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Employees
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {feedbackRequests.map((request) => (
          <TooltipProvider key={request.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="group cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/reviews/${cycleId}/employee/${request.employee_id}`)}
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {request.employee?.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base truncate">{request.employee?.name}</h3>
                        <p className="text-sm text-muted-foreground font-medium truncate">{request.employee?.role}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Completion</span>
                        <span className="text-sm font-medium">
                          {Math.round((request._count?.responses || 0) / (request.target_responses || 1) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(request._count?.responses || 0) / (request.target_responses || 1) * 100} 
                        className="h-2"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            determineRequestStatus(request) === REQUEST_STATUS.COMPLETED ? "default" :
                            determineRequestStatus(request) === REQUEST_STATUS.IN_PROGRESS ? "secondary" :
                            "outline"
                          } className="font-medium">
                            {determineRequestStatus(request)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          <span>{request._count?.responses || 0}/{request.target_responses}</span>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(request.unique_link || '');
                                    toast({
                                      title: "Link copied",
                                      description: "The feedback link has been copied to your clipboard.",
                                    });
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy feedback link</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeToRemove({ id: request.employee_id, name: request.employee?.name || '' });
                                    setShowRemoveDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove employee</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>View detailed feedback progress</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Cycle Analytics */}
      {reviewCycle && (
        <div className="mt-8">
          <CycleAnalytics reviewCycle={reviewCycle} />
        </div>
      )}

      <Dialog open={showAddEmployeesDialog} onOpenChange={setShowAddEmployeesDialog}>
        <DialogContent className="max-w-[400px] p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Add Employees</DialogTitle>
          </DialogHeader>

          {showNewEmployeeForm ? (
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewEmployeeForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateEmployee} className="flex-1">
                  Create
                </Button>
              </div>
            </div>
          ) : isFetchingEmployees ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableEmployees.length > 0 ? (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                {availableEmployees.map(employee => (
                  <div
                    key={employee.id}
                    className={cn(
                      "relative rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedEmployeeIds.has(employee.id) 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => toggleEmployeeSelection(employee.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.has(employee.id)}
                        onChange={() => toggleEmployeeSelection(employee.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <h3 className="font-medium text-sm">{employee.name}</h3>
                        <p className="text-xs text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewEmployeeForm(true)}
                >
                  Create New
                </Button>
                <Button
                  onClick={handleAddEmployees}
                  disabled={selectedEmployeeIds.size === 0 || isAddingEmployees}
                >
                  {isAddingEmployees ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      Add ({selectedEmployeeIds.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">No employees available</p>
              <Button
                onClick={() => setShowNewEmployeeForm(true)}
                className="w-full"
              >
                Create New Employee
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {employeeToRemove?.name || 'this employee'} from the review cycle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 