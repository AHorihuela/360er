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
  // Calculate total target responses across all employees
  const totalTargetResponses = reviewCycle.feedback_requests?.reduce((acc, req) => 
    acc + (req.target_responses || 0), 0) || 0;

  // Calculate total actual responses across all employees
  const totalResponses = reviewCycle.feedback_requests?.reduce((acc, req) => 
    acc + (req.feedback_responses?.length || 0), 0) || 0;

  // Calculate progress as a percentage of all target responses
  const progressPercentage = totalTargetResponses > 0 
    ? Math.min(100, (totalResponses / totalTargetResponses) * 100) 
    : 0;

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
          <h3 className="text-lg font-semibold">Review Cycle Progress</h3>
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
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {totalResponses} of {totalTargetResponses} responses received
          </span>
        </div>
      </div>
    </Card>
  );
} 