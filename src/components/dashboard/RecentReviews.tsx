import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ManagerSurveyReviewCard } from './ManagerSurveyReviewCard';
import { DashboardFeedbackResponse } from '@/types/feedback/dashboard';
import { FeedbackStatus, RelationshipType, CoreFeedbackResponse } from '@/types/feedback/base';
import { MessageSquare, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface RecentReviewsProps {
  feedbackRequests: Array<{
    id: string;
    employee?: {
      id: string;
      name: string;
      role: string;
    };
    feedback_responses?: Array<{
      id: string;
      submitted_at: string;
      relationship: string;
      [key: string]: any;
    }>;
  }>;
  questionIdToTextMap: Record<string, string>;
  reviewCycleType?: '360_review' | 'manager_effectiveness' | 'manager_to_employee';
  reviewCycleId: string;
}

// Manager-to-Employee Timeline Component
function ManagerFeedbackTimeline({ 
  feedbackRequests,
  cycleId 
}: { 
  feedbackRequests: RecentReviewsProps['feedbackRequests'];
  cycleId: string;
}) {
  const navigate = useNavigate();
  const [visibleEntries, setVisibleEntries] = useState(8);

  // Collect all feedback entries and sort by date
  const allEntries = feedbackRequests.flatMap(request => 
    (request.feedback_responses || []).map(response => ({
      id: response.id,
      employee: request.employee,
      submittedAt: response.submitted_at,
      content: response.areas_for_improvement || response.strengths || response.content || '',
      source: response.source || 'web',
      relationship: response.relationship
    }))
  ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const visibleFeedback = allEntries.slice(0, visibleEntries);

  if (allEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No feedback entries yet</h3>
        <p className="text-sm">Start providing feedback to your team members to see entries here</p>
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Recent Feedback
        </h2>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {visibleFeedback.map((entry, index) => (
          <Card 
            key={entry.id} 
            className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => entry.employee?.id && navigate(`/reviews/${cycleId}/employee/${entry.employee.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-medium">
                    {getInitials(entry.employee?.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.employee?.name || 'Unknown Employee'}</span>
                    {entry.employee?.role && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.employee.role}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(entry.submittedAt), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {entry.content || 'No content available'}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(entry.submittedAt), 'MMM d, yyyy')}
                    </div>
                    {entry.source && entry.source !== 'web' && (
                      <Badge variant="outline" className="text-xs">
                        {entry.source}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allEntries.length > visibleEntries && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => setVisibleEntries(prev => prev + 8)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Load More Feedback
          </Button>
        </div>
      )}
    </div>
  );
}

export function RecentReviews({ 
  feedbackRequests,
  questionIdToTextMap,
  reviewCycleType = '360_review',
  reviewCycleId
}: RecentReviewsProps) {
  const [visibleReviews, setVisibleReviews] = useState(6);

  // For manager-to-employee feedback, use the timeline component
  if (reviewCycleType === 'manager_to_employee') {
    return <ManagerFeedbackTimeline feedbackRequests={feedbackRequests} cycleId={reviewCycleId} />;
  }

  // Original logic for 360 reviews and manager effectiveness surveys
  console.log(`Processing Recent Reviews for cycle type: ${reviewCycleType}`);
  console.log(`Received ${feedbackRequests.length} feedback requests`);
  
  const allResponses = feedbackRequests.flatMap(request => {
    console.log(`Processing request ${request.id} with ${request.feedback_responses?.length || 0} responses`);
    
    if (!request.feedback_responses || request.feedback_responses.length === 0) {
      console.log(`No responses found for request ${request.id}`);
      return [];
    }
    
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