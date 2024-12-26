import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Users, CalendarRange, Activity, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployees, setHasEmployees] = useState(false);
  const [hasReviewCycles, setHasReviewCycles] = useState(false);
  const [stats, setStats] = useState({
    pendingFeedback: 0,
    completedReviews: 0,
    recentActivity: 0
  });

  useEffect(() => {
    async function checkState() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for employees
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          return;
        }

        // Check for review cycles
        const { data: reviewCycles, error: cyclesError } = await supabase
          .from('review_cycles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (cyclesError) {
          console.error('Error fetching review cycles:', cyclesError);
          return;
        }

        const hasEmployees = (employees?.length ?? 0) > 0;
        const hasReviewCycles = (reviewCycles?.length ?? 0) > 0;

        setHasEmployees(hasEmployees);
        setHasReviewCycles(hasReviewCycles);

        if (hasEmployees && hasReviewCycles) {
          // Get all review cycles for this user
          const { data: userCycles } = await supabase
            .from('review_cycles')
            .select('id')
            .eq('user_id', user.id);

          if (userCycles && userCycles.length > 0) {
            // Get feedback requests for all cycles
            const cycleIds = userCycles.map(cycle => cycle.id);
            const { data: feedbackRequests } = await supabase
              .from('feedback_requests')
              .select('status')
              .in('review_cycle_id', cycleIds);

            if (feedbackRequests) {
              setStats({
                pendingFeedback: feedbackRequests.filter(s => s.status === 'pending').length,
                completedReviews: feedbackRequests.filter(s => s.status === 'completed').length,
                recentActivity: feedbackRequests.length
              });
            }
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

  // Show onboarding for new users
  if (!hasEmployees || !hasReviewCycles) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to FuboLens! 👋</h1>
            <p className="text-lg text-muted-foreground">Let's get you set up with everything you need.</p>
          </div>

          <div className="grid gap-6">
            {/* Step 1: Add Team Members */}
            <div className={`p-6 rounded-lg border ${!hasEmployees ? 'bg-primary/5 border-primary' : 'bg-muted'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${!hasEmployees ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Step 1: Add Your Team Members</h3>
                    {!hasEmployees && (
                      <Button onClick={() => navigate('/employees')} className="bg-primary text-white hover:bg-primary/90">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Start by adding the employees you want to collect feedback for.</p>
                </div>
              </div>
            </div>

            {/* Step 2: Create Review Cycle */}
            <div className={`p-6 rounded-lg border ${hasEmployees && !hasReviewCycles ? 'bg-primary/5 border-primary' : 'bg-muted'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${hasEmployees && !hasReviewCycles ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                  <CalendarRange className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Step 2: Create a Review Cycle</h3>
                    {hasEmployees && !hasReviewCycles && (
                      <Button onClick={() => navigate('/reviews/new-cycle')} className="bg-primary text-white hover:bg-primary/90">
                        Start Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Set up your first review cycle to start collecting feedback.</p>
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
            Welcome back! Here's an overview of your feedback system.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardTitle>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Reviews submitted in last 24 hours</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pending Feedback</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
            <div className="text-2xl font-bold">{stats.pendingFeedback}</div>
            <p className="text-xs text-muted-foreground">Awaiting responses</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Completed Reviews</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
            <div className="text-2xl font-bold">{stats.completedReviews}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
} 