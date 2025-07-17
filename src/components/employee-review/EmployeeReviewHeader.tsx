import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Copy } from 'lucide-react';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';
import { getSurveyTypeBadge } from './utils';

interface EmployeeReviewHeaderProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  onNavigateBack: () => void;
  onCopyLink: () => void;
}

export function EmployeeReviewHeader({
  reviewCycle,
  feedbackRequest,
  onNavigateBack,
  onCopyLink
}: EmployeeReviewHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button 
          onClick={onNavigateBack}
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold">{feedbackRequest?.employee?.name}</h1>
            <p className="text-sm text-muted-foreground">{feedbackRequest?.employee?.role}</p>
          </div>
          {getSurveyTypeBadge(reviewCycle.type)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {reviewCycle?.type === 'manager_to_employee' ? (
          <>
            <Button
              key="add-feedback"
              variant="default"
              size="sm"
              onClick={() => document.getElementById('manager-feedback-input')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Add Feedback
            </Button>
            <Button
              key="ai-report"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('ai-report')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 text-xs"
            >
              Generate Report
            </Button>
            <Button
              key="detailed-feedback"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('detailed-feedback')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 text-xs"
            >
              View Responses
            </Button>
          </>
        ) : (
          <>
            <Button
              key="copy-link"
              variant="outline"
              size="sm"
              onClick={onCopyLink}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </Button>
            <Button
              key="ai-report"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('ai-report')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 text-xs"
            >
              AI Report
            </Button>
            <Button
              key="detailed-feedback"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('detailed-feedback')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 text-xs"
            >
              Detailed Feedback
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 