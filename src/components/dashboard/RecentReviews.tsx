import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardFeedbackRequest, DashboardFeedbackResponse } from '@/types/feedback/dashboard';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManagerSurveyReviewCard } from './ManagerSurveyReviewCard';
import { ReviewCycleType } from '@/types/survey';
import { FeedbackStatus, RelationshipType, CoreFeedbackResponse } from '@/types/feedback/base';

// Helper function to get initials from name
function getInitials(name: string | undefined): string {
  if (!name) return '?';
  
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface RecentReviewsProps {
  feedbackRequests: DashboardFeedbackRequest[];
  questionIdToTextMap: Record<string, string>;
  reviewCycleType?: ReviewCycleType;
  reviewCycleId?: string;
}

export function RecentReviews({ 
  feedbackRequests,
  questionIdToTextMap,
  reviewCycleType = '360_review',
  reviewCycleId
}: RecentReviewsProps) {
  const [visibleReviews, setVisibleReviews] = useState(6);
  
  console.log(`RecentReviews called with ${feedbackRequests.length} feedback requests, cycle type: ${reviewCycleType}`);
  console.log("Question map has", Object.keys(questionIdToTextMap).length, "questions");
  
  // Get all responses with data
  const allResponses = feedbackRequests.flatMap(request => {
    // Skip if no responses or employee data
    if (!request.feedback_responses || !request.employee) {
      console.log(`Skipping request ${request.id}: has_responses=${!!request.feedback_responses}, has_employee=${!!request.employee}`);
      return [];
    }
    
    console.log(`Processing request ${request.id} with ${request.feedback_responses.length} responses`);
    
    return request.feedback_responses
      .filter(response => {
        // For manager effectiveness survey, check for structured responses
        if (reviewCycleType === 'manager_effectiveness') {
          const typedResponse = response as unknown as CoreFeedbackResponse;
          const hasResponses = typedResponse.responses !== undefined;
          console.log(`Filtering response ${response.id}: has structured responses=${hasResponses}`);
          return hasResponses;
        }
        return true;
      })
      .map(response => {
        // Cast to CoreFeedbackResponse to access needed properties
        const typedResponse = response as unknown as CoreFeedbackResponse;
        
        // Create a properly typed response object with all required fields
        const dashboardResponse: DashboardFeedbackResponse = {
          id: response.id,
          status: (typedResponse.status as FeedbackStatus) || 'completed',
          relationship: (typedResponse.relationship as RelationshipType),
          strengths: typedResponse.strengths,
          areas_for_improvement: typedResponse.areas_for_improvement,
          submitted_at: typedResponse.submitted_at || new Date().toISOString(),
          feedback_request_id: request.id,
          employee: request.employee,
          responses: typedResponse.responses || {}
        };
        
        return dashboardResponse;
      });
  });
  
  console.log(`Generated ${allResponses.length} formatted responses`);
  
  // Sort by submission date and limit by visible count
  const sortedResponses = [...allResponses]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, visibleReviews);
  
  console.log(`After sorting and slicing, we have ${sortedResponses.length} responses to display`);
  
  const loadMoreReviews = () => {
    setVisibleReviews(prev => prev + 6);
  };
  
  // If there are no responses, don't render anything
  if (allResponses.length === 0) {
    console.log("No responses to display, returning null");
    return null;
  }
  
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Reviews</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedResponses.map(review => (
          <ManagerSurveyReviewCard 
            key={review.id}
            review={review}
            questionIdToTextMap={questionIdToTextMap}
            reviewCycleId={reviewCycleId}
          />
        ))}
      </div>
      
      {allResponses.length > visibleReviews && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMoreReviews}>
            Load More Reviews
          </Button>
        </div>
      )}
    </section>
  );
}

interface ManagerReviewCardProps {
  review: {
    id: string;
    employee?: any; 
    averageScore: number;
    highestScore: [string, number] | null;
    lowestScore: [string, number] | null;
    submitted_at: string;
    responses?: Record<string, number | string>;
  };
  questionIdToTextMap: Record<string, string>;
}

function ManagerReviewCard({ review, questionIdToTextMap }: ManagerReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Helper function to get question text by ID
  const getQuestionText = (questionId: string): string => {
    return questionIdToTextMap[questionId] || `Question ${questionId.slice(0, 6)}...`;
  };
  
  // Format date
  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString();
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-primary/10">
              <AvatarFallback>{getInitials(review.employee?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{review.employee?.name || 'Unknown'}</h4>
              <div className="text-sm text-muted-foreground">
                <span>{review.employee?.role || 'No role'}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{formatDate(review.submitted_at)}</div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Manager Survey
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Average score visualization */}
        <div className="flex items-center gap-4 mb-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2",
            review.averageScore >= 4.5 ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
            review.averageScore >= 4 ? "border-green-500 bg-green-50 text-green-700" :
            review.averageScore >= 3 ? "border-blue-500 bg-blue-50 text-blue-700" :
            review.averageScore >= 2 ? "border-orange-500 bg-orange-50 text-orange-700" :
            "border-red-500 bg-red-50 text-red-700"
          )}>
            {review.averageScore.toFixed(1)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Overall Rating</div>
            <Progress 
              value={(review.averageScore / 5) * 100} 
              className={cn(
                "h-2.5 mb-1",
                review.averageScore >= 4.5 ? "bg-emerald-500" :
                review.averageScore >= 4 ? "bg-green-500" :
                review.averageScore >= 3 ? "bg-blue-500" :
                review.averageScore >= 2 ? "bg-orange-500" :
                "bg-red-500"
              )} 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
            </div>
          </div>
        </div>
        
        {/* Highest/lowest score highlights */}
        {review.highestScore && review.lowestScore && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2 rounded-md bg-green-50 border border-green-100">
              <div className="text-xs text-green-700 font-medium mb-1">Highest Score</div>
              <div className="flex items-center justify-between">
                <div className="text-sm line-clamp-1">{getQuestionText(review.highestScore[0])}</div>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                  {review.highestScore[1]}/5
                </Badge>
              </div>
            </div>
            <div className="p-2 rounded-md bg-orange-50 border border-orange-100">
              <div className="text-xs text-orange-700 font-medium mb-1">Lowest Score</div>
              <div className="flex items-center justify-between">
                <div className="text-sm line-clamp-1">{getQuestionText(review.lowestScore[0])}</div>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                  {review.lowestScore[1]}/5
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        {/* Toggle to show/hide details */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs justify-between"
        >
          {expanded ? "Hide details" : "Show all responses"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      </CardContent>
      
      {/* Expandable detailed responses */}
      {expanded && review.responses && (
        <div className="px-6 pb-4 border-t">
          <div className="pt-3 space-y-3">
            {Object.entries(review.responses)
              .filter(([, value]) => typeof value === 'number')
              .map(([questionId, value]) => (
                <div key={questionId} className="space-y-1">
                  <div className="text-sm">{getQuestionText(questionId)}</div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(Number(value) / 5) * 100} 
                      className={cn(
                        "h-1.5 w-24",
                        Number(value) >= 4.5 ? "bg-emerald-500" :
                        Number(value) >= 4 ? "bg-green-500" :
                        Number(value) >= 3 ? "bg-blue-500" :
                        Number(value) >= 2 ? "bg-orange-500" :
                        "bg-red-500"
                      )} 
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      Number(value) >= 4.5 ? "text-emerald-700" :
                      Number(value) >= 4 ? "text-green-700" :
                      Number(value) >= 3 ? "text-blue-700" :
                      Number(value) >= 2 ? "text-orange-700" :
                      "text-red-700"
                    )}>
                      {Number(value)}/5
                    </span>
                  </div>
                </div>
              ))}
            
            {/* Open-ended responses if any */}
            {Object.entries(review.responses)
              .filter(([, value]) => typeof value === 'string' && String(value).trim().length > 0)
              .map(([questionId, value]) => (
                <div key={questionId} className="pt-2 mt-2 border-t">
                  <div className="text-sm font-medium mb-1">{getQuestionText(questionId)}</div>
                  <p className="text-sm whitespace-pre-line">{String(value)}</p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </Card>
  );
} 