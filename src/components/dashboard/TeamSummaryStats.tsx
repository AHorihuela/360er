import { Info, Star } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TeamSummaryStatsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  totalReviewCount: number;
  averageEvidenceCount: number;
  evidenceCountByCompetency: Record<string, number>;
  averageConfidence: number;
  sortedScores: Array<{ name: string; score: number; confidence: 'low' | 'medium' | 'high' }>;
}

export function TeamSummaryStats({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  totalReviewCount,
  averageEvidenceCount,
  evidenceCountByCompetency,
  averageConfidence,
  sortedScores
}: TeamSummaryStatsProps) {
  const coveragePercentage = (employeesWithAnalytics / totalEmployees) * 100;
  const reviewPercentage = (includedReviewCount / totalReviewCount) * 100;
  const confidencePercentage = averageConfidence * 100;

  // Calculate weighted average score based on confidence
  const weightedAverageScore = sortedScores.reduce((acc, score) => {
    const weight = score.confidence === 'high' ? 1 : score.confidence === 'medium' ? 0.7 : 0.4;
    return acc + (score.score * weight);
  }, 0) / sortedScores.reduce((acc, score) => {
    const weight = score.confidence === 'high' ? 1 : score.confidence === 'medium' ? 0.7 : 0.4;
    return acc + weight;
  }, 0);

  // Calculate progress value (1-5 scale to 0-100)
  const scoreProgressValue = ((weightedAverageScore - 1) / 4) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
          Team Score
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] p-3">
                <div className="space-y-2">
                  <div className="font-medium">Average Competency Score</div>
                  <div className="text-sm text-muted-foreground">
                    Weighted average of all competency scores, with weights based on confidence level:
                    <ul className="space-y-1 mt-1">
                      <li>• High confidence: 100% weight</li>
                      <li>• Medium confidence: 70% weight</li>
                      <li>• Low confidence: 40% weight</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold flex items-center gap-2">
          {weightedAverageScore.toFixed(1)}
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <Badge 
            variant="secondary" 
            className={cn(
              confidencePercentage >= 80 ? "bg-green-100 text-green-700 hover:bg-green-200" :
              confidencePercentage >= 60 ? "bg-amber-50 text-amber-700 hover:bg-amber-100" :
              "bg-red-100 text-red-700 hover:bg-red-200",
              "ml-2 text-xs transition-colors"
            )}
          >
            {confidencePercentage >= 80 ? "High" :
             confidencePercentage >= 60 ? "Medium" :
             "Low"} Confidence
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">average score</div>
        <Progress 
          value={scoreProgressValue} 
          className={cn(
            "h-1 mt-2",
            scoreProgressValue >= 80 ? "bg-emerald-100 [&>div]:bg-emerald-500" :
            scoreProgressValue >= 70 ? "bg-blue-100 [&>div]:bg-blue-500" :
            scoreProgressValue >= 60 ? "bg-yellow-100 [&>div]:bg-yellow-500" :
            scoreProgressValue >= 50 ? "bg-orange-100 [&>div]:bg-orange-500" :
            "bg-red-100 [&>div]:bg-red-500"
          )}
        />
      </div>

      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
          Evidence Density
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[350px] p-3">
                <div className="space-y-2">
                  <div className="font-medium">Evidence Density</div>
                  <div className="text-sm text-muted-foreground">
                    The number of specific feedback examples our AI has identified and analyzed for each competency.
                    <div className="mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left font-medium pb-2">Competency</th>
                            <th className="text-right font-medium pb-2">Examples</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {Object.entries(evidenceCountByCompetency).map(([competency, count]) => (
                            <tr key={competency}>
                              <td className="py-1.5">{competency}</td>
                              <td className="text-right py-1.5">{count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 pt-2 border-t text-xs">
                      Higher density indicates more detailed feedback and more comprehensive analysis.
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold">{averageEvidenceCount.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">examples per competency</div>
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