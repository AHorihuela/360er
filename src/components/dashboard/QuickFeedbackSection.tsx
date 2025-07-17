import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquareText, Users } from 'lucide-react';
import { FeedbackInputForm } from '@/components/manager-feedback/FeedbackInputForm';
import { ReviewCycleWithFeedback, DashboardEmployee } from '@/types/feedback/dashboard';

interface QuickFeedbackSectionProps {
  activeReviewCycle: ReviewCycleWithFeedback;
  employees: DashboardEmployee[];
  onFeedbackSubmitted?: () => void;
}

export function QuickFeedbackSection({ 
  activeReviewCycle, 
  employees,
  onFeedbackSubmitted 
}: QuickFeedbackSectionProps) {
  // Only show for manager-to-employee cycles
  if (activeReviewCycle.type !== 'manager_to_employee') {
    return null;
  }

  // Get employees that are part of this cycle
  const cycleEmployees = activeReviewCycle.feedback_requests
    .map(request => employees.find(emp => emp.id === request.employee_id))
    .filter(Boolean) as DashboardEmployee[];

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Feedback Entry</CardTitle>
              <p className="text-sm text-muted-foreground">
                Provide feedback for your team members instantly
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              <Users className="h-3 w-3 mr-1" />
              {cycleEmployees.length} team members
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FeedbackInputForm
          reviewCycleId={activeReviewCycle.id}
          employees={cycleEmployees.map(emp => ({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            user_id: emp.user_id
          }))}
          onSubmissionSuccess={onFeedbackSubmitted}
          cycleTitle={activeReviewCycle.title}
          hideHeader={true}
        />
      </CardContent>
    </Card>
  );
} 