import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardFeedbackRequest } from "@/types/feedback/dashboard";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Users } from "lucide-react";

interface Props {
  feedbackRequests: DashboardFeedbackRequest[];
  cycleName: string;
  dueDate: string;
  totalReviews: number;
  pendingReviews: number;
}

interface DayData {
  date: string;
  responses: number;
  total: number;
}

export function FeedbackTimeline({ feedbackRequests, cycleName, dueDate, totalReviews, pendingReviews }: Props) {
  // Process the data to get responses per day
  const data: DayData[] = [];
  const responses = feedbackRequests
    .flatMap(fr => fr.feedback_responses || [])
    .filter(response => response.submitted_at)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  // Don't render anything if no responses
  if (responses.length === 0) return null;

  // Create a map of dates to response counts
  const dateMap = new Map<string, number>();
  responses.forEach(response => {
    const date = new Date(response.submitted_at).toLocaleDateString();
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  // Convert map to array and calculate running total
  let runningTotal = 0;
  Array.from(dateMap.entries()).forEach(([date, count]) => {
    runningTotal += count;
    data.push({
      date,
      responses: count,
      total: runningTotal
    });
  });

  const completionPercentage = Math.round(((totalReviews - pendingReviews) / totalReviews) * 100);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold">Response Timeline</CardTitle>
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="mr-2 h-4 w-4" />
              <span className="text-sm">Due {new Date(dueDate).toLocaleDateString('en-US', { 
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {totalReviews - pendingReviews} of {totalReviews}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-2 rounded-full bg-secondary">
                <div 
                  className="h-full rounded-full bg-primary transition-all" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium">{completionPercentage}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                className="text-muted-foreground"
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => Math.round(value).toString()}
                className="text-muted-foreground"
              />
              <Tooltip
                cursor={{ fill: 'var(--primary-foreground)', opacity: 0.1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Date
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {new Date(payload[0].payload.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Responses
                            </span>
                            <span className="font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="responses"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 