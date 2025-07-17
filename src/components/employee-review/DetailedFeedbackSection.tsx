import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Trash2, 
  Copy, 
  ArrowUpIcon, 
  EqualIcon, 
  ArrowDownIcon, 
  StarIcon, 
  TrendingUpIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { getStatusVariant, formatStatusText, getSurveyTypeBadge } from './utils';

interface DetailedFeedbackSectionProps {
  reviewCycle: ReviewCycle;
  feedbackRequest: FeedbackRequest;
  sortedFeedback: CoreFeedbackResponse[];
  surveyQuestions: Record<string, string>;
  surveyQuestionOrder: Record<string, number>;
  isQuestionsLoading: boolean;
  deletingFeedbackId: string | null;
  getQuestionTextById: (questionId: string) => string;
  onDeleteClick: (feedbackId: string) => void;
  onCopyResponses: () => void;
}

export function DetailedFeedbackSection({
  reviewCycle,
  feedbackRequest,
  sortedFeedback,
  surveyQuestions,
  surveyQuestionOrder,
  isQuestionsLoading,
  deletingFeedbackId,
  getQuestionTextById,
  onDeleteClick,
  onCopyResponses
}: DetailedFeedbackSectionProps) {
  const isManagerSurvey = reviewCycle?.type === 'manager_effectiveness';

  return (
    <section id="detailed-feedback" className="space-y-4 pt-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Detailed Feedback Responses</h2>
        <p className="text-sm text-muted-foreground">
          Individual feedback responses from all reviewers
        </p>
      </div>

      {/* Overview and Feedback Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Overview Panel */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Review Cycle</p>
                <p className="text-sm font-medium">{reviewCycle?.title}</p>
                {/* Hide due date for manager-to-employee cycles since they're continuous */}
                {reviewCycle?.type !== 'manager_to_employee' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due {reviewCycle?.review_by_date ? new Date(reviewCycle.review_by_date).toLocaleDateString() : 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Survey Type</p>
                <div>{getSurveyTypeBadge(reviewCycle.type)}</div>
              </div>

              <div>
                {reviewCycle?.type === 'manager_to_employee' ? (
                  <>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Feedback Entries</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">{feedbackRequest?._count?.responses || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        continuous feedback entries
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completion</p>
                    <div className="space-y-2">
                      <Progress 
                        value={((feedbackRequest?._count?.responses || 0) / (feedbackRequest?.target_responses || 1)) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {feedbackRequest?._count?.responses} of {feedbackRequest?.target_responses} responses
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Hide status for manager-to-employee cycles since they're continuous */}
              {reviewCycle?.type !== 'manager_to_employee' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant={getStatusVariant(feedbackRequest?.status)}>
                    {formatStatusText(feedbackRequest?.status)}
                  </Badge>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={onCopyResponses}
                disabled={!feedbackRequest?.feedback?.length}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All Responses
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Responses */}
        <div className="lg:col-span-9">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Feedback Responses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!sortedFeedback.length ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No feedback responses yet.
                </div>
              ) : (
                <div className="divide-y">
                  {sortedFeedback.map((feedback) => (
                    <div key={`${feedback.id}-container`} className="p-4">
                      <div key={`${feedback.id}-header`} className="flex items-center justify-between mb-4">
                        <div key={`${feedback.id}-badge-container`} className="flex items-center gap-2">
                          {/* Only show relationship badge for 360 reviews, not for manager surveys */}
                          {!isManagerSurvey && (
                            <Badge 
                              key={`${feedback.id}-badge`}
                              variant="outline" 
                              className={cn(
                                "text-xs capitalize flex items-center gap-1",
                                feedback.relationship === 'senior_colleague' && 'bg-blue-50 border-blue-200',
                                feedback.relationship === 'equal_colleague' && 'bg-green-50 border-green-200',
                                feedback.relationship === 'junior_colleague' && 'bg-purple-50 border-purple-200'
                              )}
                            >
                              {feedback.relationship === 'senior_colleague' && <ArrowUpIcon key={`${feedback.id}-up-icon`} className="h-3 w-3" />}
                              {feedback.relationship === 'equal_colleague' && <EqualIcon key={`${feedback.id}-equal-icon`} className="h-3 w-3" />}
                              {feedback.relationship === 'junior_colleague' && <ArrowDownIcon key={`${feedback.id}-down-icon`} className="h-3 w-3" />}
                              {feedback.relationship.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <div key={`${feedback.id}-actions`} className="flex items-center gap-4">
                          <span key={`${feedback.id}-date`} className="text-xs text-muted-foreground">
                            {new Date(feedback.submitted_at ?? feedback.created_at ?? 0).toLocaleDateString()}
                          </span>
                          <Button
                            key={`${feedback.id}-delete`}
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteClick(feedback.id)}
                            className="h-7 px-2 text-destructive hover:text-destructive-foreground"
                            aria-label="Delete feedback"
                          >
                            {deletingFeedbackId === feedback.id ? (
                              <Loader2 key={`${feedback.id}-loader`} className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 key={`${feedback.id}-trash`} className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div key={`${feedback.id}-content`} className="space-y-4">
                        {/* For manager surveys, show structured responses if available */}
                        {isManagerSurvey && feedback.responses && Object.keys(feedback.responses).length > 0 && (
                          <div key={`${feedback.id}-structured`} className="bg-blue-50 p-4 rounded-md space-y-4">
                            <h4 className="text-sm font-medium text-blue-800">Survey Responses</h4>
                            
                            {isQuestionsLoading ? (
                              <div className="py-2 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-sm text-blue-600">Loading questions...</span>
                              </div>
                            ) : (
                              // Sort responses by question order and then render
                              Object.entries(feedback.responses || {})
                                .sort(([idA], [idB]) => {
                                  // Sort by question order, fallback to questionId if order not available
                                  const orderA = surveyQuestionOrder[idA] ?? 999;
                                  const orderB = surveyQuestionOrder[idB] ?? 999;
                                  return orderA - orderB;
                                })
                                .map(([questionId, value]) => {
                                  // Get question text from question ID using the fetched questions
                                  const questionText = getQuestionTextById(questionId);
                                  
                                  // Format the value based on whether it's a number (Likert) or string (open-ended)
                                  const formattedValue = typeof value === 'number' 
                                    ? (
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "px-2 py-1 rounded-full text-xs font-medium",
                                          value === 1 && "bg-red-100 text-red-800",
                                          value === 2 && "bg-orange-100 text-orange-800",
                                          value === 3 && "bg-yellow-100 text-yellow-800",
                                          value === 4 && "bg-green-100 text-green-800",
                                          value === 5 && "bg-emerald-100 text-emerald-800"
                                        )}>
                                          {value}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          {value === 1 && "Strongly Disagree"}
                                          {value === 2 && "Disagree"}
                                          {value === 3 && "Neither agree nor disagree"}
                                          {value === 4 && "Agree"}
                                          {value === 5 && "Strongly Agree"}
                                        </span>
                                      </div>
                                    ) 
                                    : <span className="text-sm">{value}</span>;
                                  
                                  return (
                                    <div key={`${feedback.id}-q-${questionId}`} className="space-y-2 border-b border-blue-100 pb-3 last:border-0 last:pb-0">
                                      <span className="text-blue-800 font-medium block">{questionText}</span>
                                      <div className="pl-2">{formattedValue}</div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}
                        
                        {/* Show strengths for both survey types */}
                        {feedback.strengths && (
                          <div key={`${feedback.id}-strengths`} className="bg-slate-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <StarIcon className="h-4 w-4 text-yellow-500" />
                              Strengths
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {feedback.strengths}
                            </p>
                          </div>
                        )}
                        
                        {/* Show areas for improvement for both survey types */}
                        {feedback.areas_for_improvement && (
                          <div key={`${feedback.id}-improvements`} className="bg-slate-50 p-3 rounded-md">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              {reviewCycle?.type === 'manager_to_employee' ? (
                                <>
                                  <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                  Manager Feedback
                                </>
                              ) : (
                                <>
                                  <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                  Areas for Improvement
                                </>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {feedback.areas_for_improvement}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
} 