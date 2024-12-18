import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, LogOut, Trash2, Inbox, Activity } from 'lucide-react';
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
}

function StatsCard({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  color,
}: {
  icon: any;
  title: string;
  value: number;
  description?: string;
  color: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {title}
            </CardTitle>
            <div className={`p-2 rounded-full ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold">{value}</div>
            {description && (
              <CardDescription className="mt-2 text-sm">
                {description}
              </CardDescription>
            )}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
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
    completedTrend: []
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

      // For each review cycle, get the feedback request counts
      const cyclesWithCounts = await Promise.all((cyclesData || []).map(async (cycle) => {
        const { data: requests, error: requestsError } = await supabase
          .from('feedback_requests')
          .select('id, status')
          .eq('review_cycle_id', cycle.id);

        if (requestsError) {
          console.error('Error fetching feedback requests:', requestsError);
          return cycle;
        }

        const total = requests?.length || 0;
        const pending = requests?.filter(r => r.status === 'pending').length || 0;
        const completed = requests?.filter(r => r.status === 'completed').length || 0;

        return {
          ...cycle,
          _count: {
            total_feedback: total,
            pending_feedback: pending,
            completed_feedback: completed
          }
        };
      }));

      // Get feedback activity in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentActivity, error: activityError } = await supabase
        .from('feedback_responses')
        .select(`
          id,
          submitted_at,
          feedback_request:feedback_requests!feedback_request_id (
            review_cycles!review_cycle_id (
              user_id
            )
          )
        `)
        .gt('submitted_at', twentyFourHoursAgo)
        .eq('feedback_request.review_cycles.user_id', currentUserId);

      if (activityError) {
        console.error('Error fetching recent activity:', activityError);
        throw activityError;
      }

      // Update stats with simplified metrics
      setStats(prev => ({
        ...prev,
        pendingFeedback: cyclesWithCounts.reduce((acc, c) => acc + (c._count?.pending_feedback || 0), 0),
        completedReviews: cyclesWithCounts.reduce((acc, c) => acc + (c._count?.completed_feedback || 0), 0),
        realTimeMetrics: {
          activeVisitors: recentActivity?.length || 0,
          last24Hours: [] // We're not using this anymore
        },
        pendingTrend: [], // We're not using this anymore
        completedTrend: [] // We're not using this anymore
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
    } finally {
      setIsLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  async function handleDeleteFeedback(feedbackId: string) {
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
    <div className="space-y-8">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          icon={Activity}
          title="Recent Activity"
          value={stats.realTimeMetrics.activeVisitors}
          description="Reviews submitted in last 24 hours"
          color="bg-blue-500"
        />
        <StatsCard
          icon={Clock}
          title="Pending Feedback"
          value={stats.pendingFeedback}
          description="Awaiting responses"
          color="bg-yellow-500"
        />
        <StatsCard
          icon={CheckCircle}
          title="Completed Reviews"
          value={stats.completedReviews}
          description="Successfully finished"
          color="bg-green-500"
        />
      </div>

      <Card>
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
                        ? `Senior Colleague (More senior than ${feedback.feedback_request.employee.role})`
                        : feedback.relationship === 'equal_colleague'
                        ? `Equal Colleague (${feedback.feedback_request.employee.role} or equivalent)`
                        : `Junior Colleague (Less senior than ${feedback.feedback_request.employee.role})`}
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