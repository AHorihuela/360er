import { type ReviewCycle } from '@/types/review';
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  reviewCycle: ReviewCycle;
}

export function CycleAnalytics({ reviewCycle }: Props) {
  const isManagerToEmployee = reviewCycle.type === 'manager_to_employee';
  
  // Calculate total actual responses across all employees
  const totalResponses = reviewCycle.feedback_requests?.reduce((acc, req) => 
    acc + (req.feedback_responses?.length || 0), 0) || 0;

  // For M2E cycles, we don't use target responses
  const totalTargetResponses = isManagerToEmployee ? 0 : 
    reviewCycle.feedback_requests?.reduce((acc, req) => 
      acc + (req.target_responses || 0), 0) || 0;

  // Calculate progress as a percentage of all target responses (only for non-M2E cycles)
  const progressPercentage = !isManagerToEmployee && totalTargetResponses > 0 
    ? Math.min(100, (totalResponses / totalTargetResponses) * 100) 
    : 0;

  // Get recent feedback entries for M2E cycles (last 30 days)
  const getRecentFeedback = () => {
    if (!isManagerToEmployee || !reviewCycle.feedback_requests) {
      return [];
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentFeedback: Array<{
      employeeName: string;
      content: string;
      submittedAt: string;
      relationship?: string;
    }> = [];
    
    reviewCycle.feedback_requests.forEach(request => {
      if (request.feedback_responses) {
        request.feedback_responses.forEach(response => {
          const responseDate = new Date(response.submitted_at);
          if (responseDate >= thirtyDaysAgo) {
            const employeeName = Array.isArray(request.employee) 
              ? request.employee[0]?.name 
              : request.employee?.name;
            
            // For manager feedback, get the most comprehensive content available
            let content = '';
            
            // Try multiple content sources in order of preference
            if (response.areas_for_improvement?.trim()) {
              content = response.areas_for_improvement.trim();
            } else if (response.strengths?.trim()) {
              content = response.strengths.trim();
            } else if (response.responses && typeof response.responses === 'object') {
              // Check if responses contain feedback content
              const responsesObj = response.responses as any;
              content = Object.values(responsesObj).find((val: any) => 
                typeof val === 'string' && val.trim().length > 0
              ) as string || '';
            }
            
            recentFeedback.push({
              employeeName: employeeName || 'Unknown Employee',
              content: content || 'No content available',
              submittedAt: response.submitted_at,
              relationship: response.relationship
            });
          }
        });
      }
    });
    
    // Sort by most recent first
    return recentFeedback.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    ).slice(0, 5); // Show last 5 entries
  };

  const recentFeedback = getRecentFeedback();

  const getReviewStage = () => {
    if (progressPercentage === 0) return { label: 'Not Started', variant: 'secondary' as const };
    if (progressPercentage < 100) return { label: 'In Progress', variant: 'default' as const };
    return { label: 'Completed', variant: 'outline' as const };
  };

  const stage = getReviewStage();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isManagerToEmployee ? 'Feedback Activity' : 'Review Cycle Progress'}
          </h3>
          {!isManagerToEmployee && (
            <div className="flex items-center gap-2">
              <Badge variant={stage.variant}>{stage.label}</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shows progress of received responses against target responses</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isManagerToEmployee && (
            <div className="flex-1">
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            </div>
          )}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {isManagerToEmployee 
              ? `${totalResponses} feedback ${totalResponses === 1 ? 'entry' : 'entries'}`
              : `${totalResponses} of ${totalTargetResponses} responses received`
            }
          </span>
        </div>
        
        {/* Recent feedback list for M2E cycles */}
        {isManagerToEmployee && recentFeedback.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Feedback (Last 30 Days)</h4>
            <div className="space-y-2">
              {recentFeedback.map((feedback, index) => (
                <div key={index} className="text-xs p-2 rounded bg-muted/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{feedback.employeeName}</span>
                    <span className="text-muted-foreground">
                      {new Date(feedback.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {feedback.content.length > 100 
                      ? `${feedback.content.substring(0, 100)}...` 
                      : feedback.content
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Show message if no recent feedback for M2E cycles */}
        {isManagerToEmployee && recentFeedback.length === 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Feedback (Last 30 Days)</h4>
            <p className="text-xs text-muted-foreground">No feedback entries in the last 30 days</p>
          </div>
        )}
      </div>
    </Card>
  );
} 