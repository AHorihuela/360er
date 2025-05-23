import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { FeedbackTimeline } from './FeedbackTimeline';
import { RecentReviews } from './RecentReviews';
import { Legacy360Reviews } from './Legacy360Reviews';
import { ReviewCycleWithFeedback, DashboardEmployee } from '@/types/feedback/dashboard';
import { ReviewCycle } from '@/types/review';

interface AnalyticsSectionProps {
  activeReviewCycle: ReviewCycleWithFeedback;
  allReviewCycles: ReviewCycle[];
  employees: DashboardEmployee[];
  surveyQuestions: Record<string, string>;
}

export function AnalyticsSection({
  activeReviewCycle,
  allReviewCycles,
  employees,
  surveyQuestions
}: AnalyticsSectionProps) {
  const navigate = useNavigate();

  // Check if there are any responses to show analytics
  const hasResponses = activeReviewCycle.feedback_requests.some(fr => 
    fr.feedback_responses && fr.feedback_responses.length > 0
  );

  if (!hasResponses) {
    return null;
  }

  // Get the current cycle type
  const cycleType = allReviewCycles.find(c => c.id === activeReviewCycle.id)?.type || '360_review';
  console.log("Current cycle type:", cycleType);

  return (
    <div className="space-y-6">
      {/* Response Timeline */}
      <FeedbackTimeline 
        feedbackRequests={activeReviewCycle.feedback_requests}
        dueDate={activeReviewCycle.review_by_date}
        totalReviews={activeReviewCycle.total_requests}
        pendingReviews={activeReviewCycle.total_requests - activeReviewCycle.completed_requests}
      />

      {/* Link to Analytics */}
      <Card 
        onClick={() => navigate('/analytics')}
        className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team Competency Analysis</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View detailed competency analysis and insights for your team
          </p>
        </CardHeader>
      </Card>

      {/* Display the appropriate review section based on cycle type */}
      {cycleType === 'manager_effectiveness' ? (
        <div>
          <RecentReviews 
            feedbackRequests={activeReviewCycle.feedback_requests.map(request => {
              // Find the employee data for this request
              const employee = employees.find(e => e.id === request.employee_id);
              
              // Return a new request object with employee data attached
              return {
                ...request,
                employee: employee ? {
                  id: employee.id,
                  name: employee.name,
                  role: employee.role
                } : undefined
              };
            })}
            questionIdToTextMap={surveyQuestions}
            reviewCycleType='manager_effectiveness'
            reviewCycleId={activeReviewCycle.id}
          />
        </div>
      ) : (
        <Legacy360Reviews 
          activeReviewCycle={activeReviewCycle}
          employees={employees}
        />
      )}
    </div>
  );
} 