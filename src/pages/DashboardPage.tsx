import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Users, CalendarRange, Activity, Clock, CheckCircle, AlertCircle, Bell, ChevronRight, Send, PlusCircle, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ReviewCycle {
  id: string;
  title: string;
  deadline: string;
  total_requests: number;
  completed_requests: number;
}

interface ActionItem {
  id: string;
  type: 'deadline' | 'response' | 'new_feedback' | 'incomplete';
  message: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployees, setHasEmployees] = useState(false);
  const [hasReviewCycles, setHasReviewCycles] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeReviewCycles, setActiveReviewCycles] = useState<ReviewCycle[]>([]);
  const [teamInsights, setTeamInsights] = useState({
    needsFeedback: 0,
    activeContributors: 0,
  });

  useEffect(() => {
    async function checkState() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for employees
        const { count: employeeCount, error: employeesError } = await supabase
          .from('employees')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          setIsLoading(false);
          return;
        }

        console.log('Employee check:', { employeeCount });
        
        const hasEmployees = (employeeCount ?? 0) > 0;
        setHasEmployees(hasEmployees);

        // Only fetch review cycles if we have employees
        if (hasEmployees) {
          // Check for review cycles
          const { data: reviewCycles, error: cyclesError } = await supabase
            .from('review_cycles')
            .select(`
              id,
              title,
              due_date,
              feedback_requests (
                id,
                status
              )
            `)
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

          if (cyclesError) {
            console.error('Error fetching review cycles:', cyclesError);
            setIsLoading(false);
            return;
          }

          const hasReviewCycles = (reviewCycles?.length ?? 0) > 0;
          setHasReviewCycles(hasReviewCycles);

          console.log('State check:', { 
            hasEmployees, 
            employeeCount,
            hasReviewCycles,
            reviewCycleCount: reviewCycles?.length
          });

          if (hasReviewCycles && reviewCycles) {
            // Process review cycles
            const activeCycles = reviewCycles.map(cycle => ({
              id: cycle.id,
              title: cycle.title,
              deadline: cycle.due_date,
              total_requests: cycle.feedback_requests?.length ?? 0,
              completed_requests: cycle.feedback_requests?.filter(r => r.status === 'completed').length ?? 0
            }));
            setActiveReviewCycles(activeCycles);

            // Generate action items
            const actions: ActionItem[] = [];
            
            // Check deadlines
            const upcomingDeadlines = reviewCycles.filter(cycle => {
              const deadline = new Date(cycle.due_date);
              const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return daysUntilDeadline <= 7 && daysUntilDeadline > 0;
            });

            upcomingDeadlines.forEach(cycle => {
              actions.push({
                id: `deadline-${cycle.id}`,
                type: 'deadline',
                message: `Review cycle "${cycle.title}" ends in ${Math.ceil((new Date(cycle.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`,
                link: `/reviews/${cycle.id}/manage`,
                priority: 'high'
              });
            });

            // Check low response rates
            reviewCycles.forEach(cycle => {
              const responseRate = cycle.feedback_requests?.filter(r => r.status === 'completed').length ?? 0 / (cycle.feedback_requests?.length ?? 1);
              if (responseRate < 0.5) {
                actions.push({
                  id: `response-${cycle.id}`,
                  type: 'response',
                  message: `Low response rate (${Math.round(responseRate * 100)}%) for "${cycle.title}"`,
                  link: `/reviews/${cycle.id}/manage`,
                  priority: 'medium'
                });
              }
            });

            setActionItems(actions);

            // Set team insights
            setTeamInsights({
              needsFeedback: reviewCycles.reduce((acc, cycle) => 
                acc + (cycle.feedback_requests?.filter(r => r.status === 'pending').length ?? 0), 0),
              activeContributors: reviewCycles.reduce((acc, cycle) => 
                acc + (cycle.feedback_requests?.filter(r => r.status === 'completed').length ?? 0), 0)
            });
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkState();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show onboarding for new users only if they have no employees
  if (!hasEmployees) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to Squad360! 👋
            </h1>
            <p className="text-lg text-muted-foreground">Let's get you set up with everything you need.</p>
          </div>

          <div className="grid gap-6">
            {/* Step 1: Add Team Members */}
            <div className="p-6 rounded-lg border bg-primary/5 border-primary">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Add Your Team Members</h3>
                    <Button 
                      onClick={() => navigate('/employees')} 
                      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
                    >
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Start by adding the employees you want to collect feedback for.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show regular dashboard for existing users
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what needs your attention.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/reviews/new-cycle')}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Review Cycle
          </Button>
        </div>
      </div>

      {/* Action Items Section */}
      {actionItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <AlertCircle className="mr-2 h-5 w-5" />
              Needs Your Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100"
              >
                <div className="flex items-center gap-3">
                  {item.type === 'deadline' && <Clock className="h-5 w-5 text-orange-500" />}
                  {item.type === 'response' && <Activity className="h-5 w-5 text-orange-500" />}
                  <span className="text-sm font-medium">{item.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.link)}
                  className="text-orange-700 hover:text-orange-800 hover:bg-orange-100"
                >
                  Take Action
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Review Cycles */}
      <div className="grid gap-6">
        <h2 className="text-xl font-semibold">Active Review Cycles</h2>
        {activeReviewCycles.map(cycle => (
          <Card key={cycle.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{cycle.title}</CardTitle>
                  <CardDescription>
                    Due {new Date(cycle.deadline).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/reviews/${cycle.id}/manage`)}
                >
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Response Rate</span>
                  <span className="font-medium">
                    {Math.round((cycle.completed_requests / cycle.total_requests) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(cycle.completed_requests / cycle.total_requests) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{cycle.completed_requests} completed</span>
                  <span>{cycle.total_requests - cycle.completed_requests} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team Overview</span>
              <Users className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Needs Feedback</span>
                <span className="font-medium">{teamInsights.needsFeedback}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Contributors</span>
                <span className="font-medium">{teamInsights.activeContributors}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analytics</span>
              <BarChart className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View detailed feedback analytics and trends.
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/reviews/analytics')}
            >
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 