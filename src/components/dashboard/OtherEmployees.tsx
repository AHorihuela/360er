import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DashboardEmployee, ReviewCycleWithFeedback } from '@/types/feedback/dashboard';

interface OtherEmployeesProps {
  employeesData: DashboardEmployee[];
  activeReviewCycle: ReviewCycleWithFeedback | null;
  onAddEmployeeToCycle: (employeeId: string) => void;
  isMasterAccount?: boolean;
  viewingAllAccounts?: boolean;
  currentUserId?: string;
  activeReviewCycleUserId?: string;
}

export function OtherEmployees({ 
  employeesData, 
  activeReviewCycle, 
  onAddEmployeeToCycle,
  isMasterAccount = false,
  viewingAllAccounts = false,
  currentUserId,
  activeReviewCycleUserId
}: OtherEmployeesProps) {
  if (!activeReviewCycle) {
    return null;
  }

  const otherEmployees = employeesData.filter(
    employee => !activeReviewCycle.feedback_requests.some(fr => fr.employee_id === employee.id)
  );

  if (otherEmployees.length === 0) {
    return null;
  }

  // Check if we're in master mode viewing another user's cycle
  const isViewingOtherUsersCycle = isMasterAccount && 
    viewingAllAccounts && 
    currentUserId && 
    activeReviewCycleUserId && 
    currentUserId !== activeReviewCycleUserId;

  return (
    <div className="space-y-4 mt-8 pt-8 border-t">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-muted-foreground">Other Employees</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {otherEmployees.map((employee) => (
          <Card 
            key={employee.id}
            className="group relative hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.role}</p>
                </div>
              </div>
            </CardContent>
            {/* Hover Overlay - Only show if user can actually add employees */}
            {!isViewingOtherUsersCycle && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEmployeeToCycle(employee.id);
                  }}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Add to Current Cycle
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 