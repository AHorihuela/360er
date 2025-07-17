import { FeedbackAnalytics } from './FeedbackAnalytics';
import { ManagerSurveyAnalytics } from './ManagerSurveyAnalytics';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';

interface AnalyticsSectionProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  surveyQuestions: Record<string, string>;
  surveyQuestionOrder: Record<string, number>;
}

export function AnalyticsSection({
  reviewCycle,
  feedbackRequest,
  surveyQuestions,
  surveyQuestionOrder
}: AnalyticsSectionProps) {
  const isManagerSurvey = reviewCycle?.type === 'manager_effectiveness';
  const hasResponses = feedbackRequest?.feedback && feedbackRequest.feedback.length > 0;

  if (!hasResponses) {
    return null;
  }

  return (
    <section className="space-y-4 pb-6">
      {/* Manager Survey Analytics - Only show for manager effectiveness surveys with responses */}
      {isManagerSurvey && (
        <ManagerSurveyAnalytics 
          feedbackResponses={feedbackRequest.feedback || []} 
          questionIdToTextMap={surveyQuestions}
          questionOrder={surveyQuestionOrder}
        />
      )}

      {/* Analytics Section - Only show for 360 feedback */}
      {!isManagerSurvey && reviewCycle?.type !== 'manager_to_employee' && (
        <FeedbackAnalytics
          feedbackResponses={feedbackRequest.feedback || []}
          feedbackRequestId={feedbackRequest.id}
        />
      )}
    </section>
  );
} 