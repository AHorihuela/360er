import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ReviewCycleWithFeedback } from '@/types/feedback/dashboard';

interface ActiveReviewCycleCardProps {
  activeReviewCycle: ReviewCycleWithFeedback;
}

export function ActiveReviewCycleCard({ activeReviewCycle }: ActiveReviewCycleCardProps) {
  const navigate = useNavigate();

  return (
    <Card 
      onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
      className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
    >
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>{activeReviewCycle.title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Due {new Date(activeReviewCycle.review_by_date).toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Overall Completion</span>
            <span className="font-medium">
              {activeReviewCycle.total_requests === 0 ? '0' : Math.round((activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100)}%
            </span>
          </div>
          <Progress 
            value={activeReviewCycle.total_requests === 0 ? 0 : (activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{activeReviewCycle.completed_requests} reviews completed</span>
            <span>{activeReviewCycle.total_requests - activeReviewCycle.completed_requests} pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 