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
  const totalResponses = reviewCycle.feedback_requests?.reduce((acc, req) => 
    acc + (req.feedback_responses?.length || 0), 0) || 0;

  const totalRequests = reviewCycle.feedback_requests?.length || 0;
  const progressPercentage = totalRequests > 0 ? (totalResponses / totalRequests) * 100 : 0;

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
                  <p>Shows the current stage of the review cycle</p>
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
            {totalResponses} responses received
          </span>
        </div>
      </div>
    </Card>
  );
} 