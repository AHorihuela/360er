import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, CheckCircle, LogOut, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DashboardStats {
  activeReviews: number;
  pendingFeedback: number;
  completedReviews: number;
  recentFeedback: FeedbackResponse[];
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
  const [stats, setStats] = useState<DashboardStats>({
    activeReviews: 0,
    pendingFeedback: 0,
    completedReviews: 0,
    recentFeedback: []
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      console.log('Fetching review cycles...');
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('review_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (cyclesError) {
        console.error('Error fetching review cycles:', cyclesError);
        throw cyclesError;
      }

      // For each review cycle, get the feedback request counts
      const cyclesWithCounts = await Promise.all(cyclesData.map(async (cycle) => {
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

      console.log('Fetched review cycles with counts:', cyclesWithCounts);
      setReviewCycles(cyclesWithCounts || []);

      // Get recent feedback
      const { data: recentFeedback, error: feedbackError } = await supabase
        .from('feedback_responses')
        .select(`
          id,
          submitted_at,
          relationship,
          strengths,
          areas_for_improvement,
          feedback_request (
            employee:employees (
              name,
              role
            ),
            review_cycle:review_cycles (
              id,
              title
            )
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (feedbackError) throw feedbackError;

      // Transform the data to match our interface
      const formattedFeedback = (recentFeedback || []).map((feedback): FeedbackResponse => ({
        id: feedback.id,
        submitted_at: feedback.submitted_at,
        relationship: feedback.relationship,
        strengths: feedback.strengths,
        areas_for_improvement: feedback.areas_for_improvement,
        feedback_request: {
          employee: feedback.feedback_request.employee,
          review_cycle: feedback.feedback_request.review_cycle
        }
      }));

      setStats(prev => ({
        ...prev,
        recentFeedback: formattedFeedback
      }));
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
      const { error } = await supabase
        .from('feedback_responses')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      // Update the stats to remove the deleted feedback
      setStats(prev => ({
        ...prev,
        recentFeedback: prev.recentFeedback.filter(f => f.id !== feedbackId),
        completedReviews: prev.completedReviews - 1
      }));

      toast({
        title: "Feedback deleted",
        description: "The feedback has been permanently deleted.",
      });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Activity className="h-4 w-4 text-blue-500" />
              Active Reviews
            </CardTitle>
            <p className="text-2xl font-bold">{stats.activeReviews}</p>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Feedback
            </CardTitle>
            <p className="text-2xl font-bold">{stats.pendingFeedback}</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed Reviews
            </CardTitle>
            <p className="text-2xl font-bold">{stats.completedReviews}</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b p-4">
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {stats.recentFeedback.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No feedback received yet
            </div>
          ) : (
            stats.recentFeedback.map((feedback) => (
              <div key={feedback.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {feedback.employee?.name} - {feedback.employee?.role}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feedback.review_cycle?.title}
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
                        ? `Senior Colleague (More senior than ${feedback.employee?.role})`
                        : feedback.relationship === 'equal_colleague'
                        ? `Equal Colleague (${feedback.employee?.role} or equivalent)`
                        : `Junior Colleague (Less senior than ${feedback.employee?.role})`}
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