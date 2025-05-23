import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { DashboardEmployee } from '@/types/feedback/dashboard';

interface CurrentCycleEmployeesProps {
  employees: DashboardEmployee[];
  activeReviewCycleId: string;
}

export function CurrentCycleEmployees({ employees, activeReviewCycleId }: CurrentCycleEmployeesProps) {
  const navigate = useNavigate();

  const currentCycleEmployees = employees.filter(e => e.total_reviews > 0);

  if (currentCycleEmployees.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Current Cycle Employees</h2>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {currentCycleEmployees.map((employee) => (
          <Card 
            key={employee.id}
            className="hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/reviews/${activeReviewCycleId}/employee/${employee.id}`)}
          >
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback>
                      {employee.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">{employee.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{employee.role}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Feedback Progress</span>
                  <span className="font-medium">
                    {employee.total_reviews === 0 ? '0' : Math.round((employee.completed_reviews / employee.total_reviews) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={employee.total_reviews === 0 ? 0 : (employee.completed_reviews / employee.total_reviews) * 100} 
                  className="h-2 sm:h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{employee.completed_reviews} of {employee.total_reviews} responses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 