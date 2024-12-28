import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReviewCycle, FeedbackRequest, REQUEST_STATUS } from '@/types/review';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function determineRequestStatus(
  responseCount: number,
  targetResponses: number,
  manuallyCompleted: boolean
): typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS] {
  if (manuallyCompleted) return REQUEST_STATUS.COMPLETED;
  if (responseCount === 0) return REQUEST_STATUS.PENDING;
  if (responseCount < targetResponses) return REQUEST_STATUS.IN_PROGRESS;
  if (responseCount === targetResponses) return REQUEST_STATUS.COMPLETED;
  return REQUEST_STATUS.EXCEEDED;
}

export function ReviewCycleDetailsPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showAddEmployeesDialog, setShowAddEmployeesDialog] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{ id: string; name: string; role: string; }>>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '' });
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
            )
          )
        `)
        .eq('id', cycleId)
        .single();

      if (cycleError) throw cycleError;

      // Process feedback requests
      const processedRequests = cycleData.feedback_requests.map((request: any) => {
        const responseCount = request.feedback_responses?.length || 0;
        const status = determineRequestStatus(
          responseCount,
          request.target_responses,
          request.manually_completed
        );

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

  async function handleRemoveEmployee(requestId: string) {
    if (!confirm('Are you sure you want to remove this employee from the review cycle?')) return;

    setRemovingEmployeeId(requestId);
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setFeedbackRequests(prev => prev.filter(req => req.id !== requestId));
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

  function getStatusText(request: FeedbackRequest) {
    const count = request._count?.responses || 0;
    const target = request.target_responses;
    return `${count}/${target} responses`;
  }

  async function handleUpdateDueDate(date: Date | undefined) {
    if (!date || !cycleId) return;
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('review_cycles')
        .update({ review_by_date: date.toISOString() })
        .eq('id', cycleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Due date updated successfully",
      });

      // Refresh the data by refetching
      const { data: updatedCycle } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (updatedCycle) {
        setReviewCycle(updatedCycle);
      }
    } catch (error) {
      console.error('Error updating due date:', error);
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/reviews')}
            variant="gradient"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{reviewCycle?.title}</h1>
            <p className="text-muted-foreground">Due {new Date(reviewCycle?.review_by_date || '').toLocaleDateString()}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddEmployeesDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employees
        </Button>
      </div>

      <Dialog open={showAddEmployeesDialog} onOpenChange={setShowAddEmployeesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Employees to Review</DialogTitle>
            <DialogDescription>
              Select employees to add to this review cycle or create a new employee.
            </DialogDescription>
          </DialogHeader>

          {showNewEmployeeForm ? (
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Employee name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Employee role"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewEmployeeForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingEmployees}>
                  {isAddingEmployees ? 'Adding...' : 'Add Employee'}
                </Button>
              </div>
            </form>
          ) : isFetchingEmployees ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableEmployees.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableEmployees.map(employee => (
                  <div
                    key={employee.id}
                    className={`
                      relative rounded-lg border p-4 cursor-pointer transition-colors
                      ${selectedEmployeeIds.has(employee.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                      }
                    `}
                    onClick={() => toggleEmployeeSelection(employee.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.has(employee.id)}
                        onChange={() => toggleEmployeeSelection(employee.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <h3 className="font-medium">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewEmployeeForm(true)}
                >
                  Create New Employee
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
                      <Plus className="mr-2 h-4 w-4" />
                      Add Selected ({selectedEmployeeIds.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                No employees available to add to this review cycle.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => setShowNewEmployeeForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Employee
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {feedbackRequests.map((request) => (
          <Card 
            key={request.id}
            className="group cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/reviews/${cycleId}/employee/${request.employee_id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {request.employee?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{request.employee?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{request.employee?.role}</p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(request)}>
                  {getStatusText(request)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>
                    {Math.round(((request._count?.responses || 0) / request.target_responses) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((request._count?.responses || 0) / request.target_responses) * 100} 
                  className="h-2"
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(request.unique_link);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmployee(request.id);
                    }}
                    disabled={removingEmployeeId === request.id}
                    className="text-destructive hover:text-destructive-foreground"
                  >
                    {removingEmployeeId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 