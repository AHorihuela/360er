import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TeamSummaryStatsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  totalReviewCount: number;
  averageEvidenceCount: number;
  averageConfidence: number;
}

export function TeamSummaryStats({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  totalReviewCount,
  averageEvidenceCount,
  averageConfidence
}: TeamSummaryStatsProps) {
  const coveragePercentage = (employeesWithAnalytics / totalEmployees) * 100;
  const reviewPercentage = (includedReviewCount / totalReviewCount) * 100;
  const confidencePercentage = averageConfidence * 100;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
          Team Coverage
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] p-3">
                <div className="space-y-2">
                  <div className="font-medium">Employee Coverage</div>
                  <div className="text-sm text-muted-foreground">
                    <ul className="space-y-1">
                      <li>• {employeesWithAnalytics} employees with sufficient feedback</li>
                      <li>• Out of {totalEmployees} total employees</li>
                      <li>• Minimum 5 reviews required per employee</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold">{employeesWithAnalytics}/{totalEmployees}</div>
        <div className="text-sm text-muted-foreground">employees analyzed</div>
        <Progress value={coveragePercentage} className="h-1 mt-2" />
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Review Coverage</div>
        <div className="text-2xl font-semibold">{includedReviewCount}/{totalReviewCount}</div>
        <div className="text-sm text-muted-foreground">reviews analyzed</div>
        <Progress value={reviewPercentage} className="h-1 mt-2" />
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Average Evidence</div>
        <div className="text-2xl font-semibold">{averageEvidenceCount.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">pieces per competency</div>
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
          Analysis Confidence
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] p-3">
                <div className="space-y-2">
                  <div className="font-medium">Confidence Score</div>
                  <div className="text-sm text-muted-foreground">
                    Based on:
                    <ul className="space-y-1 mt-1">
                      <li>• Evidence quantity and quality</li>
                      <li>• Score consistency</li>
                      <li>• Relationship coverage</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold">{(confidencePercentage).toFixed(0)}%</div>
        <div className="text-sm text-muted-foreground">average confidence</div>
        <Progress 
          value={confidencePercentage} 
          className={cn(
            "h-1 mt-2",
            confidencePercentage >= 80 ? "bg-green-100 [&>div]:bg-green-500" :
            confidencePercentage >= 60 ? "bg-yellow-100 [&>div]:bg-yellow-500" :
            "bg-red-100 [&>div]:bg-red-500"
          )}
        />
      </div>
    </div>
  );
} 