import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { FeedbackRequest } from '@/types/review';
import { CycleAnalytics } from '@/components/review-cycle/CycleAnalytics';
import { FeedbackRequestCard } from '@/components/review-cycle/FeedbackRequestCard';
import { AddEmployeesDialog } from '@/components/review-cycle/AddEmployeesDialog';
import { RemoveEmployeeDialog } from '@/components/review-cycle/RemoveEmployeeDialog';
import { EditableTitle } from '@/components/review-cycle/EditableTitle';
import { useReviewCycle } from '@/hooks/useReviewCycle';

export function ReviewCycleDetailsPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isLoading,
    reviewCycle,
    feedbackRequests,
    updateTitle,
    removeEmployee,
    setFeedbackRequests
  } = useReviewCycle(cycleId);

  const [showAddEmployeesDialog, setShowAddEmployeesDialog] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{ id: string; name: string; role: string; user_id: string; }>>([]);
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<{ id: string; name: string } | null>(null);

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
          <EditableTitle
            title={reviewCycle.title}
            dueDate={reviewCycle.review_by_date}
            onSave={updateTitle}
          />
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
          <FeedbackRequestCard
            key={request.id}
            request={request}
            cycleId={cycleId || ''}
            onDelete={(request) => {
              setEmployeeToRemove({
                id: request.id,
                name: request.employee?.name || ''
              });
              setShowRemoveDialog(true);
            }}
            onCopyLink={(link) => {
              navigator.clipboard.writeText(link);
              toast({
                title: "Link copied",
                description: "The feedback link has been copied to your clipboard.",
              });
            }}
          />
        ))}
      </div>

      {reviewCycle && (
        <div className="mt-8">
          <CycleAnalytics reviewCycle={reviewCycle} />
        </div>
      )}

      <AddEmployeesDialog
        open={showAddEmployeesDialog}
        onOpenChange={setShowAddEmployeesDialog}
        availableEmployees={availableEmployees}
        isLoading={isFetchingEmployees}
        onAddEmployees={async (selectedIds) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const { error: insertError } = await supabase
              .from('feedback_requests')
              .insert(
                selectedIds.map(employeeId => ({
                  review_cycle_id: cycleId,
                  employee_id: employeeId,
                  unique_link: crypto.randomUUID(),
                  status: 'pending',
                  target_responses: 10,
                  manually_completed: false
                }))
              );

            if (insertError) throw insertError;

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
              .in('employee_id', selectedIds)
              .order('created_at', { ascending: false });

            if (selectError) throw selectError;

            const typedRequests = (newRequests || []).map(req => ({
              ...req,
              employee: req.employee?.[0]
            })) as FeedbackRequest[];

            setFeedbackRequests(prev => [...prev, ...typedRequests]);
            toast({
              title: "Success",
              description: `Added ${typedRequests.length} employee(s) to the review cycle`,
            });
          } catch (error) {
            console.error('Error adding employees:', error);
            toast({
              title: "Error",
              description: "Failed to add employees to review cycle",
              variant: "destructive",
            });
            throw error;
          }
        }}
        onCreateEmployee={async (newEmployee) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

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

            const typedRequests = (requestData || []).map(req => ({
              ...req,
              employee: req.employee?.[0]
            })) as FeedbackRequest[];

            setFeedbackRequests(prev => [...prev, ...typedRequests]);
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
            throw error;
          }
        }}
      />

      <RemoveEmployeeDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        employeeName={employeeToRemove?.name || ''}
        onConfirm={async () => {
          if (!employeeToRemove) return;
          const success = await removeEmployee(employeeToRemove.id);
          if (success) {
            setShowRemoveDialog(false);
            setEmployeeToRemove(null);
            toast({
              title: "Success",
              description: "Employee removed from review cycle",
            });
          }
        }}
      />
    </div>
  );
} 