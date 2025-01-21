import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoverageMetricsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  analyzedReviewCount: number;
}

export function CoverageMetrics({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  analyzedReviewCount
}: CoverageMetricsProps) {
  const teamCoveragePercent = totalEmployees > 0 
    ? (employeesWithAnalytics / totalEmployees) * 100 
    : 0;

  const reviewCoveragePercent = includedReviewCount > 0 
    ? (analyzedReviewCount / includedReviewCount) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Team Coverage</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of team members with analyzed feedback</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold">
            {employeesWithAnalytics}/{totalEmployees}
          </div>
          <div className="text-sm text-muted-foreground">
            employees analyzed
          </div>
          <Progress value={teamCoveragePercent} className="mt-2" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Review Coverage</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of reviews analyzed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold">
            {analyzedReviewCount}/{includedReviewCount}
          </div>
          <div className="text-sm text-muted-foreground">
            reviews analyzed
          </div>
          <Progress value={reviewCoveragePercent} className="mt-2" />
        </div>
      </Card>
    </div>
  );
} 