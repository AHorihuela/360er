import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Trash2, Loader2, UserPlus } from 'lucide-react';
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

      const feedbackRequestsToAdd = Array.from(selectedEmployeeIds).map(employeeId => ({
        review_cycle_id: cycleId,
        employee_id: employeeId,
        unique_link: crypto.randomUUID(),
        status: 'pending',
        target_responses: 10
      }));

      const { data, error } = await supabase
        .from('feedback_requests')
        .insert(feedbackRequestsToAdd)
        .select('*, employee:employees(*)');

      if (error) throw error;

      setFeedbackRequests(prev => [...prev, ...data]);
      setSelectedEmployeeIds(new Set());
      setShowAddEmployeesDialog(false);
      toast({
        title: "Success",
        description: `Added ${data.length} employee(s) to the review cycle`,
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
            <h1 className="text-2xl font-bold">{reviewCycle?.title}</h1>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {feedbackRequests.map((request) => (
          <Card 
            key={request.id}
            className="group cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/reviews/${cycleId}/employee/${request.employee_id}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-sm">
                    {request.employee?.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm truncate">{request.employee?.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{request.employee?.role}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">
                        {Math.round(((request._count?.responses || 0) / request.target_responses) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={((request._count?.responses || 0) / request.target_responses) * 100} 
                      className="h-1.5"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Badge 
                        variant={getStatusBadgeVariant(request)}
                        className="text-xs px-1.5 h-5"
                      >
                        {request._count?.responses || 0}/{request.target_responses}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(request.unique_link);
                          }}
                          className="h-7 px-2"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEmployee(request.id, request.employee?.name || 'this employee');
                          }}
                          disabled={removingEmployeeId === request.id}
                          className="h-7 px-2 text-destructive hover:text-destructive-foreground"
                        >
                          {removingEmployeeId === request.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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