import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardFeedbackRequest } from "@/types/feedback/dashboard";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface Props {
  feedbackRequests: DashboardFeedbackRequest[];
}

interface DayData {
  date: string;
  responses: number;
  total: number;
}

export function FeedbackTimeline({ feedbackRequests }: Props) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Response Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-lg border shadow-sm">
                        <p className="text-sm font-medium">
                          {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].value} responses
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].payload.total} total
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="responses" 
                fill="currentColor" 
                className="fill-primary/20 hover:fill-primary/30 transition-colors"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 