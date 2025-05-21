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
import { MasterAccountToggle } from '@/components/ui/MasterAccountToggle';
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
}

function EmployeeTable({ 
  employees, 
  onEdit, 
  onDelete, 
  onViewReview,
  isDeleteLoading,
  employeeToDelete
}: EmployeeTableProps) {
  return (
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
          {employees.map((employee) => (
            <tr key={employee.id} className="border-b">
              <td className="p-4">{employee.name}</td>
              <td className="p-4">{employee.role}</td>
              <td className="p-4">
                <div className="flex gap-2">
                  {employee.latest_feedback_request?.review_cycle_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewReview(
                        employee.latest_feedback_request!.review_cycle_id,
                        employee.id
                      )}
                      title="View Latest Review"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isMasterAccount } = useAuth();
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
  const [viewingAllAccounts, setViewingAllAccounts] = useState<boolean>(() => {
    const savedState = localStorage.getItem('masterViewingAllAccounts');
    return savedState === 'true';
  });

  useEffect(() => {
    fetchEmployees();
  }, [viewingAllAccounts]);

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
        console.log('[DEBUG] Filtering employees by user_id:', user.id);
        query = query.eq('user_id', user.id);
      } else {
        console.log('[DEBUG] Showing all employees (master account mode)');
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

  // Add styles to employee rows if they're from another account
  function getRowStyles(employee: Employee): string {
    const isOwnedByCurrentUser = employee.user_id === user?.id;
    return isMasterAccount && viewingAllAccounts && !isOwnedByCurrentUser
      ? "border-b border-amber-200 bg-amber-50/50"
      : "border-b";
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
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">
              Manage your team members and their reviews
            </p>
          </div>
          <Button onClick={() => {
            setIsEditing(false);
            setCurrentEmployee({ id: '', name: '', role: '' });
            setShowModal(true);
          }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Add the Master Account Toggle */}
        <MasterAccountToggle 
          viewingAllAccounts={viewingAllAccounts} 
          setViewingAllAccounts={setViewingAllAccounts} 
        />

        {isLoading ? (
          <div className="text-center py-8">Loading employees...</div>
        ) : error ? (
          <div className="text-center text-destructive py-8">{error}</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No employees found</p>
            <Button onClick={() => {
              setIsEditing(false);
              setCurrentEmployee({ id: '', name: '', role: '' });
              setShowModal(true);
            }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Employee
            </Button>
          </div>
        ) : (
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
                {employees.map((employee) => {
                  // Check if employee belongs to current user
                  const isOwnedByCurrentUser = employee.user_id === user?.id;
                  const rowClasses = getRowStyles(employee);
                  
                  return (
                    <tr key={employee.id} className={rowClasses}>
                      <td className="p-4">
                        <div className="flex items-center">
                          {employee.name}
                          {isMasterAccount && viewingAllAccounts && !isOwnedByCurrentUser && (
                            <Badge variant="outline" className="ml-2 bg-amber-100 text-xs">
                              Other User
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{employee.role}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {employee.latest_feedback_request?.review_cycle_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReview(
                                employee.latest_feedback_request!.review_cycle_id,
                                employee.id
                              )}
                              title="View Latest Review"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Only show edit/delete buttons for user's own employees */}
                          {(!isMasterAccount || !viewingAllAccounts || isOwnedByCurrentUser) && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(employee)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(employee.id)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={currentEmployee.name}
                  onChange={(e) => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                  placeholder="John Doe"
                  disabled={isEditLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  required
                  value={currentEmployee.role}
                  onChange={(e) => setCurrentEmployee({ ...currentEmployee, role: e.target.value })}
                  placeholder="Software Engineer"
                  disabled={isEditLoading}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                  setCurrentEmployee({ id: '', name: '', role: '' });
                }}
                disabled={isEditLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditLoading}>
                {isEditLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Employee'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee
              and all associated feedback requests.
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
              onClick={() => employeeToDelete && handleDelete(employeeToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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