import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { ScoreWithOutlier } from '@/components/dashboard/types';
import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { calculateWeightedAverageScore } from '../utils/statCalculations';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeamComparisonCardProps {
  score: ScoreWithOutlier;
  teamScores: ScoreWithOutlier[];
  feedbackRequests: DashboardFeedbackRequest[];
  filters?: {
    relationships?: ('senior' | 'peer' | 'junior')[];
  };
}

// Helper function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export function TeamComparisonCard({ score, teamScores, feedbackRequests }: TeamComparisonCardProps) {
  console.log('TeamComparisonCard Props:', {
    currentScore: score,
    teamScoresLength: teamScores.length,
    feedbackRequestsLength: feedbackRequests.length
  });

  // Create a map to store all scores per employee
  const employeeScores = new Map<string, {
    name: string;
    scores: Array<{ score: number; confidence: 'low' | 'medium' | 'high' }>;
  }>();

  // Collect all scores per employee
  feedbackRequests.forEach(request => {
    const employee = request.employee;
    if (employee?.id && employee?.name && request.analytics?.insights) {
      request.analytics.insights.forEach(insight => {
        insight.competencies.forEach(comp => {
          if (comp.name === score.name) {
            const currentEmployeeData = employeeScores.get(employee.id) || {
              name: employee.name,
              scores: []
            };
            
            currentEmployeeData.scores.push({
              score: comp.score,
              confidence: comp.confidence || 'medium'
            });

            employeeScores.set(employee.id, currentEmployeeData);
          }
        });
      });
    }
  });

  // Calculate weighted average for each employee
  const data = Array.from(employeeScores.entries())
    .map(([employeeId, { name, scores }]) => {
      const weightedAvg = calculateWeightedAverageScore(scores);
      // Calculate overall confidence based on individual scores
      const confidenceCounts = scores.reduce((acc, { confidence }) => {
        acc[confidence]++;
        return acc;
      }, { low: 0, medium: 0, high: 0 });
      
      // Determine overall confidence level
      let overallConfidence: 'low' | 'medium' | 'high';
      if (confidenceCounts.high > scores.length / 2) {
        overallConfidence = 'high';
      } else if (confidenceCounts.low > scores.length / 2) {
        overallConfidence = 'low';
      } else {
        overallConfidence = 'medium';
      }
      
      console.log(`Weighted average for ${name}:`, weightedAvg, 'confidence:', overallConfidence);

      return {
        employeeId,
        name,
        initials: getInitials(name),
        score: weightedAvg,
        confidence: overallConfidence,
        isCurrentUser: employeeId === score.reviewerId
      };
    })
    .sort((a, b) => b.score - a.score);

  console.log('Final aggregated chart data:', data);

  // Calculate overall team weighted average
  const weightedTeamAverage = calculateWeightedAverageScore(
    data.map(d => ({ score: d.score, confidence: d.confidence }))
  );

  // Get confidence indicator color
  const getConfidenceColor = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Team Comparison
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-[10px] h-4 bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700">
                  alpha
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p className="font-normal text-sm">This feature is being optimized for:</p>
                <ul className="list-disc pl-4 mt-1 text-xs space-y-1">
                  <li>Score aggregation across multiple reviews</li>
                  <li>Confidence-based weighting (High: 100%, Medium: 80%, Low: 50%)</li>
                  <li>Relationship-based weighting (Senior: 40%, Peer: 35%, Junior: 25%)</li>
                  <li>Outlier detection and adjustment</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 4, left: 32 }}
              barSize={12}
            >
              <XAxis 
                type="number"
                domain={[0, 5]}
                fontSize={10}
                tickLine={false}
                axisLine={true}
                stroke="#94a3b8"
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis 
                type="category"
                dataKey="initials"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                width={32}
                interval={0}
                padding={{ top: 8, bottom: 8 }}
              />
              <Bar 
                dataKey="score" 
                background={{ fill: "#f1f5f9" }}
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isCurrentUser ? "#7c3aed" : "#94a3b8"}
                  />
                ))}
              </Bar>
              <RechartsTooltip
                cursor={{ fill: 'transparent', stroke: '#e2e8f0' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-1">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {data.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-muted-foreground">
                              Score: {data.score.toFixed(1)}
                            </span>
                            <Badge variant="secondary" className={getConfidenceColor(data.confidence)}>
                              {data.confidence}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {data.isCurrentUser && (
                        <div className="mt-1 pt-1 border-t">
                          <span className="text-[0.70rem] text-violet-500">
                            Current employee
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
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t pt-3">
          <div className="text-center">
            <div className="text-muted-foreground">Your Score</div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium mt-0.5">{score.score.toFixed(1)}</span>
              <Badge variant="secondary" className={`${getConfidenceColor(score.confidence)} text-xs`}>
                {score.confidence}
              </Badge>
            </div>
          </div>
          <div className="text-center border-l">
            <div className="text-muted-foreground">Team Avg (Weighted)</div>
            <div className="font-medium mt-0.5">{weightedTeamAverage.toFixed(1)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 