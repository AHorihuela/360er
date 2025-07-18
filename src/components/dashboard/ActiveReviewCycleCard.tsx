import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ReviewCycleWithFeedback } from '@/types/feedback/dashboard';

interface ActiveReviewCycleCardProps {
  activeReviewCycle: ReviewCycleWithFeedback;
}

export function ActiveReviewCycleCard({ activeReviewCycle }: ActiveReviewCycleCardProps) {
  const navigate = useNavigate();
  
  // Defensive programming: ensure counts are numbers to prevent NaN
  const totalRequests = activeReviewCycle.total_requests ?? 0;
  const completedRequests = activeReviewCycle.completed_requests ?? 0;
  
  // Check if this is a manager-to-employee cycle
  const isManagerToEmployee = activeReviewCycle.type === 'manager_to_employee';
  
  // For M2E cycles, count total feedback entries instead of completion
  const totalFeedbackEntries = isManagerToEmployee 
    ? activeReviewCycle.feedback_requests.reduce((total, request) => 
        total + (request.feedback_responses?.length || 0), 0)
    : 0;

  return (
    <Card 
      onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
      className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
    >
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-base md:text-lg">{activeReviewCycle.title}</span>
          {!isManagerToEmployee && (
            <span className="text-sm font-normal text-muted-foreground">
              Due {new Date(activeReviewCycle.review_by_date).toLocaleDateString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isManagerToEmployee ? (
          <div className="space-y-2 md:space-y-4">
            <div className="flex justify-between text-sm">
              <span>Feedback Activity</span>
              <span className="font-medium">
                {totalFeedbackEntries} entries
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{activeReviewCycle.feedback_requests.length} team members</span>
              <span>Continuous feedback</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-4">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span className="font-medium">
                {totalRequests === 0 ? '0' : Math.min(Math.round((completedRequests / totalRequests) * 100), 100)}%
              </span>
            </div>
            <Progress 
              value={totalRequests === 0 ? 0 : Math.min((completedRequests / totalRequests) * 100, 100)} 
              className="h-2 md:h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedRequests} reviews completed</span>
              <span>{totalRequests - completedRequests} pending</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 