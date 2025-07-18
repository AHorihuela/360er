import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardFeedbackRequest, DashboardEmployee } from "@/types/feedback/dashboard";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Calendar, MessageSquare, TrendingUp, User, Users } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Props {
  feedbackRequests: DashboardFeedbackRequest[];
  employees: DashboardEmployee[];
  cycleId: string;
}

interface EmployeeFeedbackData {
  employeeId: string;
  name: string;
  initials: string;
  role: string;
  feedbackCount: number;
  recentFeedback: number; // Last 7 days
  lastFeedbackDate?: string;
}

export function ManagerFeedbackActivity({ feedbackRequests, employees, cycleId }: Props) {
  const navigate = useNavigate();
  
  // Process data to get feedback per employee
  const employeeFeedbackData: EmployeeFeedbackData[] = feedbackRequests.map(request => {
    const employee = employees.find(emp => emp.id === request.employee_id);
    const responses = request.feedback_responses || [];
    
    // Count recent feedback (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentResponses = responses.filter(response => 
      isAfter(new Date(response.submitted_at), sevenDaysAgo)
    );

    // Get last feedback date
    const lastResponse = responses.length > 0 
      ? responses.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
      : null;

    return {
      employeeId: request.employee_id,
      name: employee?.name || 'Unknown',
      initials: employee?.name ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?',
      role: employee?.role || '',
      feedbackCount: responses.length,
      recentFeedback: recentResponses.length,
      lastFeedbackDate: lastResponse?.submitted_at
    };
  });

  // Sort by feedback count (highest first), but include all team members
  const sortedData = employeeFeedbackData.sort((a, b) => b.feedbackCount - a.feedbackCount);

  // Prepare chart data - only include employees with feedback for the chart
  const chartData = sortedData
    .filter(emp => emp.feedbackCount > 0)
    .map(emp => ({
      name: emp.name.split(' ')[0], // First name only for chart
      total: emp.feedbackCount,
      recent: emp.recentFeedback
    }));

  const totalFeedback = employeeFeedbackData.reduce((sum, emp) => sum + emp.feedbackCount, 0);
  const activeEmployees = employeeFeedbackData.filter(emp => emp.feedbackCount > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Team Feedback Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your feedback activity across team members
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {totalFeedback} total entries
              </span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {activeEmployees} of {employeeFeedbackData.length} receiving feedback
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Feedback Distribution</h4>
          {chartData.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--primary-foreground)', opacity: 0.1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-sm">
                            <div className="space-y-1">
                              <p className="font-medium">{payload[0]?.payload?.fullName || payload[0]?.payload?.name}</p>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded bg-blue-500"></div>
                                  <span className="text-sm">Total: {payload[0]?.value}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded bg-green-500"></div>
                                  <span className="text-sm">Recent: {payload[1]?.value || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="total"
                    radius={[2, 2, 0, 0]}
                    className="fill-blue-500"
                  />
                  <Bar 
                    dataKey="recent"
                    radius={[2, 2, 0, 0]}
                    className="fill-green-500"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center border border-dashed rounded-lg bg-muted/30">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No feedback data yet</p>
                <p className="text-xs">Chart will appear once you start providing feedback</p>
              </div>
            </div>
          )}
        </div>

        {/* Team Members Grid - Full Width */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-base">Team Members</h4>
            <Badge variant="secondary" className="text-xs">
              {sortedData.length} members
            </Badge>
          </div>
          
          {sortedData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sortedData.map((employee, index) => (
                <div 
                  key={employee.employeeId}
                  className="p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/reviews/${cycleId}/employee/${employee.employeeId}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                        {employee.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{employee.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{employee.role}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600">{employee.feedbackCount}</span>
                      <span className="text-xs text-muted-foreground">
                        {employee.feedbackCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    {employee.recentFeedback > 0 && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-green-50 text-green-700 border-green-200">
                        +{employee.recentFeedback} recent
                      </Badge>
                    )}
                  </div>
                  
                  {employee.lastFeedbackDate ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last: {format(new Date(employee.lastFeedbackDate), 'MMM d')}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      No feedback yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-medium mb-1">No team members in this cycle</h3>
              <p className="text-sm">Add employees to your review cycle to start providing feedback</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 