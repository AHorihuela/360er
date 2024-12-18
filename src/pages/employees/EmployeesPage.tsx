import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
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

interface Employee {
  id: string;
  name: string;
  role: string;
  created_at: string;
  user_id: string;
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState({
    id: '',
    name: '',
    role: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
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
      }

      setShowModal(false);
      setIsEditing(false);
      setCurrentEmployee({ id: '', name: '', role: '' });
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
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
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  }

  function handleEdit(employee: Employee) {
    setIsEditing(true);
    setCurrentEmployee({
      id: employee.id,
      name: employee.name,
      role: employee.role
    });
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employees</h1>
        <Button 
          onClick={() => {
            setIsEditing(false);
            setCurrentEmployee({ id: '', name: '', role: '' });
            setShowModal(true);
          }}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4">
          {employees.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No employees found</p>
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
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b">
                      <td className="p-4">{employee.name}</td>
                      <td className="p-4">{employee.role}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
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
                            onClick={() => {
                              setEmployeeToDelete(employee.id);
                              setShowDeleteDialog(true);
                            }}
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
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-md border p-2"
                  value={currentEmployee.name}
                  onChange={(e) => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Role</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-md border p-2"
                  value={currentEmployee.role}
                  onChange={(e) => setCurrentEmployee({ ...currentEmployee, role: e.target.value })}
                  placeholder="Software Engineer"
                />
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
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Save Changes' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee
              from the database.
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 