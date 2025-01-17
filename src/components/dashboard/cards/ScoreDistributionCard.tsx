import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, TooltipProps } from "recharts";
import { BarChart2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScoreWithOutlier } from '../types';

interface ScoreDistributionCardProps {
  score: ScoreWithOutlier;
}

export function ScoreDistributionCard({ score }: ScoreDistributionCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-6 bg-background rounded-lg border relative group hover:border-yellow-200 transition-colors cursor-help">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-yellow-50">
                <BarChart2 className="h-4 w-4 text-yellow-500" />
              </div>
              <span className="text-sm font-medium">Score Distribution</span>
            </div>
            <div className="space-y-4">
              {/* Histogram using Recharts */}
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { score: 1, count: score.scoreDistribution?.[1] || 0 },
                    { score: 2, count: score.scoreDistribution?.[2] || 0 },
                    { score: 3, count: score.scoreDistribution?.[3] || 0 },
                    { score: 4, count: score.scoreDistribution?.[4] || 0 },
                    { score: 5, count: score.scoreDistribution?.[5] || 0 },
                  ]}>
                    <XAxis 
                      dataKey="score"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="#888888"
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="#888888"
                      width={30}
                    />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      className={cn(
                        "[&_.recharts-bar-rectangle]:fill-yellow-100 [&_.recharts-bar-rectangle]:hover:fill-yellow-200",
                        "[&_.recharts-bar-rectangle]:stroke-none [&_.recharts-bar-rectangle]:transition-all"
                      )}
                    />
                    <RechartsTooltip
                      content={({ active, payload }: TooltipProps<number, string>) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as { score: number; count: number };
                        const isCurrentScore = Math.abs(score.score - data.score) < 0.5;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Score
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {data.score}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Reviews
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {data.count}
                                </span>
                              </div>
                            </div>
                            {isCurrentScore && (
                              <div className="mt-1 pt-1 border-t">
                                <span className="text-[0.70rem] text-yellow-500">
                                  Your current score
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats Summary */}
              <div className="flex items-center justify-between text-sm border-t pt-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Your Score:</span>
                    <span className="font-medium">{score.score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Reviews:</span>
                    <span className="font-medium">{Object.values(score.scoreDistribution || {}).reduce((a, b) => a + b, 0)}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-muted-foreground">Average:</span>
                    <span className="font-medium">{score.averageScore?.toFixed(1) || "N/A"}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 justify-end cursor-help">
                          <span className="text-muted-foreground">Spread:</span>
                          <span className="font-medium">±{(score.scoreSpread || 0).toFixed(1)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2">
                          <p>The standard deviation of scores, indicating how spread out the ratings are:</p>
                          <ul className="text-sm space-y-1 list-disc pl-4">
                            <li>±0.5 or less: Very consistent ratings</li>
                            <li>±0.5 to ±1.0: Moderate variation</li>
                            <li>Above ±1.0: High variation in ratings</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p>Distribution of scores across all reviewers:</p>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Bars show how many reviewers gave each score</li>
              <li>Highlighted bar shows where your score falls</li>
              <li>Spread indicates range between highest and lowest scores</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">This helps you understand how consistently you were rated and how your score compares to individual ratings.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 