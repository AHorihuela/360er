import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  Brain,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react';
import { FeedbackTimeline } from './FeedbackTimeline';
import { ManagerFeedbackActivity } from './ManagerFeedbackActivity';
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
      {/* Response Timeline or Manager Feedback Activity */}
      {cycleType === 'manager_to_employee' ? (
        <ManagerFeedbackActivity 
          feedbackRequests={activeReviewCycle.feedback_requests}
          employees={employees}
        />
      ) : (
        <FeedbackTimeline 
          feedbackRequests={activeReviewCycle.feedback_requests}
          dueDate={activeReviewCycle.review_by_date}
          totalReviews={activeReviewCycle.total_requests}
          pendingReviews={activeReviewCycle.total_requests - activeReviewCycle.completed_requests}
          cycleType={cycleType}
        />
      )}

      {/* Team Competency Analysis Card - for 360 review cycles only */}
      {cycleType === '360_review' && (
        <Card 
          onClick={() => navigate('/analytics')}
          className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-all duration-200 hover:shadow-md group"
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-200">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">Team Competency Analysis</span>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      <Zap className="h-3 w-3 mr-1" />
                      AI-Powered
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    Comprehensive insights into team performance and growth areas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">View Analysis</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Manager Effectiveness Analysis Card - for manager survey cycles */}
      {cycleType === 'manager_effectiveness' && (
        <Card 
          onClick={() => navigate('/analytics')}
          className="bg-gradient-to-br from-amber/5 to-orange/5 border-amber/10 cursor-pointer hover:bg-amber/10 transition-all duration-200 hover:shadow-md group"
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber/10 flex items-center justify-center group-hover:bg-amber/15 transition-colors duration-200">
                  <BarChart3 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">Manager Effectiveness Analysis</span>
                    <Badge variant="secondary" className="text-xs bg-amber/10 text-amber-700 border-amber/20">
                      <Activity className="h-3 w-3 mr-1" />
                      Survey Data
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    Leadership insights and management effectiveness metrics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">View Results</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

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
      ) : cycleType === 'manager_to_employee' ? (
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
            questionIdToTextMap={{}} // M2E doesn't use survey questions
            reviewCycleType='manager_to_employee'
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