import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { ScoreWithOutlier } from '@/components/dashboard/types';
import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';

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

  // Create a map of employee IDs to their names
  const employeeNames = new Map<string, string>();
  feedbackRequests.forEach(request => {
    if (request.employee?.id && request.employee?.name) {
      employeeNames.set(request.employee.id, request.employee.name);
    }
  });

  // Create a map of competency scores to employee IDs
  const scoreToEmployeeId = new Map<number, string>();
  feedbackRequests.forEach(request => {
    request.analytics?.insights?.forEach(insight => {
      insight.competencies.forEach(comp => {
        if (comp.name === score.name) {
          scoreToEmployeeId.set(comp.score, request.employee?.id || '');
        }
      });
    });
  });

  // Map team scores to chart data
  const data = teamScores
    .map(teamScore => {
      const employeeId = scoreToEmployeeId.get(teamScore.score);
      if (!employeeId || !employeeNames.has(employeeId)) return null;

      const name = employeeNames.get(employeeId)!;
      console.log('Mapping score for', name, ':', teamScore.score);

      return {
        name,
        initials: getInitials(name),
        score: teamScore.score,
        isCurrentUser: Math.abs(teamScore.score - score.score) < 0.01
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score);

  console.log('Final chart data:', data);

  // Calculate team average
  const teamAverage = data.reduce((sum, d) => sum + d.score, 0) / data.length;

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Team Comparison</CardTitle>
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
                          <span className="font-bold text-muted-foreground">
                            Score: {data.score.toFixed(1)}
                          </span>
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
            <div className="font-medium mt-0.5">{score.score.toFixed(1)}</div>
          </div>
          <div className="text-center border-l">
            <div className="text-muted-foreground">Team Avg</div>
            <div className="font-medium mt-0.5">{teamAverage.toFixed(1)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 