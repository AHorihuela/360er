import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PlusIcon, Pencil, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  created_at: string;
  user_id: string;
  feedback_requests?: FeedbackRequest[];
  latest_feedback_request: {
    id: string;
    review_cycle_id: string;
    response_count?: number;
  } | null;
}

interface EmployeeFormState {
  id: string;
  name: string;
  role: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onViewReview: (cycleId: string, employeeId: string) => void;
  isDeleteLoading: boolean;
  employeeToDelete: string | null;
  isMasterAccount?: boolean;
  viewingAllAccounts?: boolean;
  currentUserId?: string;
}

function EmployeeTable({ 
  employees, 
  onEdit, 
  onDelete, 
  onViewReview,
  isDeleteLoading,
  employeeToDelete,
  isMasterAccount = false,
  viewingAllAccounts = false,
  currentUserId
}: EmployeeTableProps) {
  // Group employees by ownership when in master mode
  const groupedEmployees = isMasterAccount && viewingAllAccounts && currentUserId
    ? {
        myTeam: employees.filter(emp => emp.user_id === currentUserId),
        otherTeams: employees.filter(emp => emp.user_id !== currentUserId)
      }
    : { myTeam: employees, otherTeams: [] };

  const renderEmployeeRows = (employeeList: Employee[], isOtherTeam = false) => {
    return employeeList.map((employee) => (
      <tr key={employee.id} className={`border-b ${isOtherTeam ? 'bg-blue-50/30' : ''}`}>
        <td className="p-4">
          <div className="flex items-center gap-2">
            {employee.name}
            {isOtherTeam && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                Other Account
              </Badge>
            )}
          </div>
        </td>
        <td className="p-4">{employee.role}</td>
        <td className="p-4">
          <div className="flex gap-2">
            {employee.latest_feedback_request?.review_cycle_id && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewReview(
                    employee.latest_feedback_request!.review_cycle_id,
                    employee.id
                  )}
                  title="View Latest Review"
                  className="relative"
                >
                  <FileText className="h-4 w-4" />
                  {employee.latest_feedback_request.response_count !== undefined && employee.latest_feedback_request.response_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {employee.latest_feedback_request.response_count}
                    </span>
                  )}
                </Button>
              </div>
            )}
            {!isOtherTeam && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(employee)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDelete(employee.id)}
                  disabled={isDeleteLoading && employeeToDelete === employee.id}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      {/* My Team Section */}
      {groupedEmployees.myTeam.length > 0 && (
        <div>
          {isMasterAccount && viewingAllAccounts && groupedEmployees.otherTeams.length > 0 && (
            <h3 className="text-lg font-semibold mb-4 text-green-700">My Team</h3>
          )}
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Role</th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {renderEmployeeRows(groupedEmployees.myTeam, false)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Teams Section */}
      {groupedEmployees.otherTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-blue-700">Other Teams</h3>
          <div className="rounded-lg border border-blue-200">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-blue-50/50">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Role</th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {renderEmployeeRows(groupedEmployees.otherTeams, true)}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            These team members belong to other accounts. You can view their reviews but cannot edit or delete them.
          </p>
        </div>
      )}
    </div>
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isMasterAccount, viewingAllAccounts } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeFormState>({
    id: '',
    name: '',
    role: ''
  });

  useEffect(() => {
    // Debounce the fetchEmployees call to prevent race conditions
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [viewingAllAccounts, isMasterAccount]);

  async function fetchEmployees(): Promise<void> {
    try {
      setError(null);
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No authenticated user found');
        return;
      }

      // Build the query - filter by user_id only if not in master account mode
      let query = supabase
        .from('employees')
        .select(`
          *,
          feedback_requests (
            id,
            review_cycle_id,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      // Only filter by user_id if not a master account or not viewing all accounts
      const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterByUser) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process the data to get the latest feedback request for each employee
      const processedData = data.map(employee => ({
        ...employee,
        latest_feedback_request: employee.feedback_requests
          ? employee.feedback_requests.sort((a: FeedbackRequest, b: FeedbackRequest) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0] || null
          : null
      }));

      // Fetch feedback response counts for latest feedback requests
      const latestFeedbackRequestIds = processedData
        .filter(emp => emp.latest_feedback_request)
        .map(emp => emp.latest_feedback_request!.id);

      if (latestFeedbackRequestIds.length > 0) {
        const { data: responseCounts, error: responseError } = await supabase
          .from('feedback_responses')
          .select('feedback_request_id')
          .in('feedback_request_id', latestFeedbackRequestIds);

        if (!responseError && responseCounts) {
          // Count responses per feedback request
          const responseCountMap = responseCounts.reduce((acc, response) => {
            acc[response.feedback_request_id] = (acc[response.feedback_request_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Add response counts to processed data
          processedData.forEach(employee => {
            if (employee.latest_feedback_request) {
              employee.latest_feedback_request.response_count = 
                responseCountMap[employee.latest_feedback_request.id] || 0;
            }
          });
        }
      }
      
      setEmployees(processedData);
    } catch (error) {
      const supabaseError = error as { message: string };
      setError(supabaseError.message);
      toast({
        title: "Error",
        description: "Failed to load employees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      setIsEditLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (isEditing) {
        const { error } = await supabase
          .from('employees')
          .update({ 
            name: currentEmployee.name, 
            role: currentEmployee.role 
          })
          .eq('id', currentEmployee.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setEmployees(employees.map(emp => 
          emp.id === currentEmployee.id 
            ? { ...emp, name: currentEmployee.name, role: currentEmployee.role }
            : emp
        ));

        toast({
          title: "Success",
          description: "Employee updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from('employees')
          .insert([{ 
            name: currentEmployee.name, 
            role: currentEmployee.role,
            user_id: user.id
          }])
          .select()
          .single();

        if (error) throw error;
        setEmployees([data, ...employees]);

        toast({
          title: "Success",
          description: "Employee added successfully",
        });
      }

      setShowModal(false);
      setIsEditing(false);
      setCurrentEmployee({ id: '', name: '', role: '' });
    } catch (error) {
      const supabaseError = error as { message: string };
      setError(supabaseError.message);
      toast({
        title: "Error",
        description: isEditing ? "Failed to update employee" : "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setIsEditLoading(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      setIsDeleteLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEmployees(employees.filter(emp => emp.id !== id));
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);

      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error) {
      const supabaseError = error as { message: string };
      setError(supabaseError.message);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    } finally {
      setIsDeleteLoading(false);
    }
  }

  function handleEdit(employee: Employee): void {
    setIsEditing(true);
    setCurrentEmployee({
      id: employee.id,
      name: employee.name,
      role: employee.role
    });
    setShowModal(true);
  }

  function handleViewReview(cycleId: string, employeeId: string): void {
    navigate(`/reviews/${cycleId}/employee/${employeeId}`);
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="rounded-lg border bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your team members
            </p>
          </div>
          <Button onClick={() => {
            setIsEditing(false);
            setCurrentEmployee({ id: '', name: '', role: '' });
            setShowModal(true);
          }}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add Team Member
          </Button>
        </div>

        {/* Display master account mode badge if viewing all accounts */}
        {isMasterAccount && viewingAllAccounts && (
          <div className="flex justify-end">
            <Badge variant="outline" className="bg-amber-100">
              Master Account Mode
            </Badge>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p>Loading team members...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive p-4">
            <p className="text-destructive">{error}</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No team members found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first team member to start collecting feedback
            </p>
            <Button onClick={() => {
              setIsEditing(false);
              setCurrentEmployee({ id: '', name: '', role: '' });
              setShowModal(true);
            }}>
              <PlusIcon className="mr-2 h-4 w-4" /> Add Team Member
            </Button>
          </div>
        ) : (
          <EmployeeTable 
            employees={employees} 
            onEdit={handleEdit} 
            onDelete={(id) => {
              setEmployeeToDelete(id);
              setShowDeleteDialog(true);
            }}
            onViewReview={handleViewReview}
            isDeleteLoading={isDeleteLoading}
            employeeToDelete={employeeToDelete}
            isMasterAccount={isMasterAccount}
            viewingAllAccounts={viewingAllAccounts}
            currentUserId={user?.id}
          />
        )}
      </div>

      {/* Employee Add/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={currentEmployee.name}
                onChange={(e) => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                required
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={currentEmployee.role}
                onChange={(e) => setCurrentEmployee({ ...currentEmployee, role: e.target.value })}
                required
                placeholder="Enter job title/role"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditLoading}
              >
                {isEditLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setEmployeeToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this team member and all associated feedback. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setEmployeeToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (employeeToDelete) {
                  handleDelete(employeeToDelete);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleteLoading}
            >
              {isDeleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 