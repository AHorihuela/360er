import { Card, CardContent } from '@/components/ui/card';
import { FeedbackInputForm } from '@/components/manager-feedback/FeedbackInputForm';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';
import { Employee } from '@/types/review';

interface ManagerFeedbackSectionProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  cycleId: string;
  onSubmissionSuccess: () => void;
}

export function ManagerFeedbackSection({
  reviewCycle,
  feedbackRequest,
  cycleId,
  onSubmissionSuccess
}: ManagerFeedbackSectionProps) {
  if (reviewCycle?.type !== 'manager_to_employee') {
    return null;
  }

  return (
    <section id="manager-feedback-input" className="space-y-4 pb-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Provide Feedback</h2>
        <p className="text-sm text-muted-foreground">
          Add continuous feedback for {feedbackRequest?.employee?.name}
        </p>
      </div>
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-6">
          <FeedbackInputForm
            reviewCycleId={cycleId}
            employees={feedbackRequest?.employee ? [feedbackRequest.employee as Employee] : []}
            onSubmissionSuccess={onSubmissionSuccess}
            cycleTitle={reviewCycle?.title}
            hideEmployeeSelector={true}
          />
        </CardContent>
      </Card>
    </section>
  );
} 