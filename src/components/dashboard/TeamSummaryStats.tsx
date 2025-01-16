import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface TeamSummaryStatsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  totalReviewCount: number;
  averageEvidenceCount: number;
}

export function TeamSummaryStats({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  totalReviewCount,
  averageEvidenceCount
}: TeamSummaryStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-3">
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
          Reviews Processed
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] p-3">
                <div className="space-y-2">
                  <div className="font-medium">Reviews Breakdown</div>
                  <div className="text-sm text-muted-foreground">
                    <ul className="space-y-1">
                      <li>• {includedReviewCount} reviews analyzed</li>
                      <li>• Across {employeesWithAnalytics} employees</li>
                      <li>• Out of {totalReviewCount} total reviews</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold">{includedReviewCount}/{totalReviewCount}</div>
        <div className="text-sm text-muted-foreground">feedback responses</div>
      </div>
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
      </div>
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1">Average Evidence</div>
        <div className="text-2xl font-semibold">{averageEvidenceCount.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">pieces per competency</div>
      </div>
    </div>
  );
} 