import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FeedbackResponse {
  id: string;
  submitted_at: string;
  relationship: string;
  strengths: string;
  areas_for_improvement: string;
  feedback_request: {
    employee: {
      name: string;
      role: string;
    };
    review_cycle: {
      id: string;
      title: string;
    };
  };
}

interface MetricData {
  timestamp: string;
  value: number;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface DashboardStats {
  pendingFeedback: number;
  completedReviews: number;
  recentFeedback: FeedbackResponse[];
  realTimeMetrics: {
    activeVisitors: number;
    last24Hours: MetricData[];
  };
  pendingTrend: MetricData[];
  completedTrend: MetricData[];
  currentCycle: {
    id: string;
    name: string;
    dueDate: string;
    completion: number;
    completedCount: number;
    pendingCount: number;
    employees: Array<Employee & {
      progress: number;
      responsesReceived: number;
      targetResponses: number;
    }>;
  } | null;
  otherEmployees: Employee[];
}

interface FeedbackRequest {
  id: string;
  status: string;
  target_responses: number;
  employee: Employee;
  feedback_responses: Array<{ id: string }>;
}

function EmptyFeedback() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No feedback yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        When you receive feedback from your team members, it will appear here.
      </p>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
      </CardHeader>
    </Card>
  );
}

function LoadingFeedback() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    pendingFeedback: 0,
    completedReviews: 0,
    recentFeedback: [],
    realTimeMetrics: {
      activeVisitors: 0,
      last24Hours: []
    },
    pendingTrend: [],
    completedTrend: [],
    currentCycle: null,
    otherEmployees: []
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchDashboardStats(user.id);
        startRealtimeSubscription(user.id);
      } else {
        navigate('/login');
      }
    });

    return () => {
      // Cleanup realtime subscription
    };
  }, [navigate]);

  async function startRealtimeSubscription(userId: string) {
    // Subscribe to feedback_requests table for real-time updates
    const channel = supabase
      .channel('public:feedback_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_requests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchDashboardStats(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function fetchDashboardStats(currentUserId: string | null) {
    if (!currentUserId) return;
    try {
      console.log('Fetching review cycles...');
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (cyclesError) {
        console.error('Error fetching review cycles:', cyclesError);
        throw cyclesError;
      }

      // Get current cycle (most recent)
      const currentCycle = cyclesData?.[0];

      // Get all employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('user_id', currentUserId) as { data: Employee[] | null, error: any };

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      // Get feedback requests for current cycle
      const { data: currentRequests, error: requestsError } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          status,
          target_responses,
          employee:employees (
            id,
            name,
            role
          ),
          feedback_responses (
            id
          )
        `)
        .eq('review_cycle_id', currentCycle?.id) as { data: FeedbackRequest[] | null, error: any };

      if (requestsError) {
        console.error('Error fetching feedback requests:', requestsError);
        throw requestsError;
      }

      // Process current cycle data
      const currentCycleEmployees = currentRequests?.map(request => ({
        ...request.employee,
        progress: (request.feedback_responses?.length || 0) / (request.target_responses || 1) * 100,
        responsesReceived: request.feedback_responses?.length || 0,
        targetResponses: request.target_responses || 0
      })) || [];

      // Calculate cycle completion
      const totalResponses = currentRequests?.reduce((acc, req) => acc + (req.feedback_responses?.length || 0), 0) || 0;
      const totalTargetResponses = currentRequests?.reduce((acc, req) => acc + (req.target_responses || 0), 0) || 1;
      const cycleCompletion = (totalResponses / totalTargetResponses) * 100;

      // Find employees not in current cycle
      const currentEmployeeIds = new Set(currentCycleEmployees.map(e => e.id));
      const otherEmployees = allEmployees?.filter(emp => !currentEmployeeIds.has(emp.id)) || [];

      // Update stats with current cycle info
      setStats(prev => ({
        ...prev,
        currentCycle: currentCycle ? {
          id: currentCycle.id,
          name: currentCycle.name,
          dueDate: currentCycle.review_by_date,
          completion: cycleCompletion,
          completedCount: totalResponses,
          pendingCount: totalTargetResponses - totalResponses,
          employees: currentCycleEmployees
        } : null,
        otherEmployees,
        pendingFeedback: totalTargetResponses - totalResponses,
        completedReviews: totalResponses
      }));

      // Get recent feedback
      console.log('Fetching recent feedback...');
      try {
        const { data: recentFeedback, error: feedbackError } = await supabase
          .from('feedback_responses')
          .select(`
            id,
            submitted_at,
            relationship,
            strengths,
            areas_for_improvement,
            feedback_request_id,
            feedback_requests!feedback_request_id (
              id,
              employee_id,
              review_cycle_id,
              employees!employee_id (
                name,
                role
              ),
              review_cycles!review_cycle_id (
                id,
                title,
                user_id
              )
            )
          `)
          .eq('feedback_requests.review_cycles.user_id', currentUserId)
          .order('submitted_at', { ascending: false })
          .limit(5);

        if (feedbackError) {
          console.error('Error fetching recent feedback:', feedbackError);
          throw feedbackError;
        }

        console.log('Recent feedback data:', recentFeedback);

        if (!recentFeedback || recentFeedback.length === 0) {
          console.log('No feedback found');
          setStats(prev => ({
            ...prev,
            recentFeedback: []
          }));
          return;
        }

        // Transform the data to match our interface
        const formattedFeedback = recentFeedback
          .filter((feedback: any) => 
            feedback.feedback_requests?.employees && 
            feedback.feedback_requests?.review_cycles
          )
          .map((feedback: any): FeedbackResponse => {
            console.log('Processing feedback:', feedback);
            return {
              id: feedback.id,
              submitted_at: feedback.submitted_at,
              relationship: feedback.relationship,
              strengths: feedback.strengths || '',
              areas_for_improvement: feedback.areas_for_improvement || '',
              feedback_request: {
                employee: {
                  name: feedback.feedback_requests.employees.name || 'Unknown',
                  role: feedback.feedback_requests.employees.role || 'No role'
                },
                review_cycle: {
                  id: feedback.feedback_requests.review_cycles.id,
                  title: feedback.feedback_requests.review_cycles.title || 'Untitled Review'
                }
              }
            };
          });

        console.log('Formatted feedback:', formattedFeedback);

        setStats(prev => ({
          ...prev,
          recentFeedback: formattedFeedback
        }));
      } catch (error) {
        console.error('Error in feedback processing:', error);
        toast({
          title: "Error",
          description: "Failed to load recent feedback. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  async function handleDeleteFeedback(feedbackId: string) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      // Delete the feedback response
      const { error: deleteError } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (deleteError) throw deleteError;

      // Update the local state
      setStats(prev => ({
        ...prev,
        recentFeedback: prev.recentFeedback.filter(f => f.id !== feedbackId),
        completedReviews: prev.completedReviews - 1
      }));

      toast({
        title: "Feedback deleted",
        description: "The feedback has been permanently deleted.",
      });

      // Refresh the dashboard stats
      fetchDashboardStats(userId);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>

        <Card>
          <CardHeader className="border-b p-4">
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent className="p-0">
            <LoadingFeedback />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your feedback system.
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {stats.currentCycle && (
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{stats.currentCycle.name}</CardTitle>
                <CardDescription>
                  Due {new Date(stats.currentCycle.dueDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{Math.round(stats.currentCycle.completion)}%</div>
                <div className="text-sm text-muted-foreground">
                  {stats.currentCycle.completedCount} reviews completed
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.currentCycle.pendingCount} pending
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Current Cycle Employees Section */}
      {stats.currentCycle && stats.currentCycle.employees.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current Cycle Employees</h2>
            <Button
              variant="outline"
              onClick={() => stats.currentCycle && navigate(`/reviews/${stats.currentCycle.id}`)}
              size="sm"
            >
              View Cycle Details
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.currentCycle.employees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription>{employee.role}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{Math.round(employee.progress)}%</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.responsesReceived} of {employee.targetResponses} responses
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Employees Section */}
      {stats.otherEmployees.length > 0 && (
        <div className="space-y-4 mt-8 pt-8 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-muted-foreground">Other Employees</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/reviews/new')}
              size="sm"
            >
              Start New Review Cycle
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.otherEmployees.map((employee) => (
              <Card 
                key={employee.id} 
                className="group relative hover:shadow-lg transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription>{employee.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/reviews/new')}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    Add to Review Cycle
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Feedback Section */}
      <Card className="mt-8">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Feedback</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/reviews')}>
              View All Reviews
            </Button>
          </div>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {stats.recentFeedback.length === 0 ? (
            <EmptyFeedback />
          ) : (
            stats.recentFeedback.map((feedback, index) => (
              <div
                key={feedback.id}
                className="p-4 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-5 duration-500"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {feedback.feedback_request.employee.name} - {feedback.feedback_request.employee.role}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feedback.feedback_request.review_cycle.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(feedback.submitted_at).toLocaleDateString()}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this feedback? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFeedback(feedback.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">From: </span>
                    <span className="text-muted-foreground">
                      {feedback.relationship === 'senior_colleague'
                        ? `Senior Colleague (I am more senior than ${feedback.feedback_request.employee.role})`
                        : feedback.relationship === 'equal_colleague'
                        ? `Equal Colleague (I am ${feedback.feedback_request.employee.role} or equivalent)`
                        : `Junior Colleague (I am less senior than ${feedback.feedback_request.employee.role})`}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Strengths: </span>
                    <span className="text-muted-foreground">{feedback.strengths}</span>
                  </div>
                  <div>
                    <span className="font-medium">Areas for Improvement: </span>
                    <span className="text-muted-foreground">{feedback.areas_for_improvement}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
} 