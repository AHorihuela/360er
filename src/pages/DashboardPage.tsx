import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Users, PlusCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  name: string;
  role: string;
  completed_reviews: number;
  total_reviews: number;
}

interface FeedbackRequest {
  id: string;
  employee_id: string;
  unique_link: string;
  status: string;
  target_responses: number;
  feedback_responses?: Array<{
    id: string;
    status: string;
    submitted_at: string;
    relationship: string;
  }>;
}

interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  total_requests: number;
  completed_requests: number;
}

interface ReviewCycleWithFeedback extends ReviewCycle {
  feedback_requests: FeedbackRequest[];
}

interface FeedbackResponse {
  id: string;
  status: string;
  submitted_at: string;
  relationship: string;
  strengths: string | null;
  areas_for_improvement: string | null;
  employee?: Employee;
  request_id: string;
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployees, setHasEmployees] = useState(false);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const startRealtimeSubscription = (userId: string) => {
    const feedbackChannel = supabase
      .channel('feedback-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_responses',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      feedbackChannel.unsubscribe();
    };
  };

  const fetchData = async () => {
    if (!user?.id) return;
    
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id);

    if (employeesError) {
      toast({
        title: 'Error fetching employees',
        description: employeesError.message,
        variant: 'destructive',
      });
      return;
    }

    const hasEmployeesData = (employeesData?.length ?? 0) > 0;
    setHasEmployees(hasEmployeesData);

    if (hasEmployeesData) {
      // Get most recent active review cycle with feedback requests
      const { data: reviewCycles, error: cyclesError } = await supabase
        .from('review_cycles')
        .select(`
          id,
          title,
          review_by_date,
          feedback_requests (
            id,
            status,
            employee_id,
            target_responses,
            feedback_responses (
              id,
              status,
              submitted_at,
              relationship,
              strengths,
              areas_for_improvement
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cyclesError) {
        toast({
          title: 'Error fetching review cycles',
          description: cyclesError.message,
          variant: 'destructive',
        });
        return;
      }

      if (reviewCycles && reviewCycles.length > 0) {
        const currentCycle = reviewCycles[0] as unknown as {
          id: string;
          title: string;
          review_by_date: string;
          feedback_requests: Array<{
            id: string;
            status: string;
            employee_id: string;
            target_responses: number;
            unique_link: string;
            feedback_responses: Array<{
              id: string;
              status: string;
              submitted_at: string;
              relationship: string;
              strengths: string | null;
              areas_for_improvement: string | null;
            }>;
          }>;
        };
        
        // Calculate total completed requests across all employees
        const totalRequests = currentCycle.feedback_requests.reduce((acc, fr) => 
          acc + fr.target_responses, 0);
        const completedRequests = currentCycle.feedback_requests.reduce((acc, fr) => 
          acc + (fr.feedback_responses?.length ?? 0), 0);

        const reviewCycleWithFeedback: ReviewCycleWithFeedback = {
          id: currentCycle.id,
          title: currentCycle.title,
          review_by_date: currentCycle.review_by_date,
          total_requests: totalRequests,
          completed_requests: completedRequests,
          feedback_requests: currentCycle.feedback_requests
        };

        setActiveReviewCycle(reviewCycleWithFeedback);

        // Process employees with their review status
        const employeesWithStatus = employeesData?.map(employee => {
          const employeeRequest = currentCycle.feedback_requests.find(fr => fr.employee_id === employee.id);
          return {
            ...employee,
            completed_reviews: employeeRequest?.feedback_responses?.length ?? 0,
            total_reviews: employeeRequest?.target_responses ?? 0
          };
        });

        setEmployees(employeesWithStatus || []);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    startRealtimeSubscription(user.id);
  }, [user?.id, toast]);

  // Add new function to handle adding employee to current cycle
  async function handleAddEmployeeToCycle(employeeId: string) {
    if (!activeReviewCycle) {
      toast({
        title: "No active cycle",
        description: "Please create a review cycle first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate a unique link using crypto
      const uniqueLink = crypto.randomUUID();

      // Create a new feedback request for this employee in the current cycle
      const { error: insertError } = await supabase
        .from('feedback_requests')
        .insert({
          employee_id: employeeId,
          review_cycle_id: activeReviewCycle.id,
          status: 'pending',
          target_responses: 3,
          unique_link: uniqueLink
        });

      if (insertError) throw insertError;

      // Refresh the dashboard data
      await fetchData();

      toast({
        title: "Success",
        description: "Employee added to current review cycle",
      });
    } catch (error) {
      console.error('Error adding employee to cycle:', error);
      toast({
        title: "Error",
        description: "Failed to add employee to cycle",
        variant: "destructive",
      });
    }
  }

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
                      className="bg-black hover:bg-black/90 text-white transition-all duration-300"
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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
      {/* Header with Active Review Cycle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {activeReviewCycle 
              ? `Current Review Cycle: ${activeReviewCycle.title}`
              : 'No active review cycle'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          {activeReviewCycle && (
            <Button
              onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
              variant="outline"
              className="w-full sm:w-auto hover:bg-black hover:text-white transition-all duration-300"
            >
              View Current Cycle <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => navigate('/reviews/new-cycle')}
            className="w-full sm:w-auto bg-black hover:bg-black/90 text-white transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Review Cycle
          </Button>
        </div>
      </div>

      {/* Active Review Cycle Progress */}
      {activeReviewCycle && (
        <Card 
          onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
          className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>{activeReviewCycle.title}</span>
              <span className="text-sm font-normal text-muted-foreground">
                Due {new Date(activeReviewCycle.review_by_date).toLocaleDateString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Overall Completion</span>
                <span className="font-medium">
                  {Math.round((activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100)}%
                </span>
              </div>
              <Progress 
                value={(activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{activeReviewCycle.completed_requests} reviews completed</span>
                <span>{activeReviewCycle.total_requests - activeReviewCycle.completed_requests} pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Cycle Employees */}
      {employees.filter(e => e.total_reviews > 0).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Current Cycle Employees</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {employees
              .filter(e => e.total_reviews > 0)
              .map((employee) => (
                <Card 
                  key={employee.id}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/reviews/${activeReviewCycle?.id}/employee/${employee.id}`)}
                >
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarFallback>
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">{employee.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{employee.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Feedback Progress</span>
                        <span className="font-medium">
                          {Math.round((employee.completed_reviews / employee.total_reviews) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(employee.completed_reviews / employee.total_reviews) * 100} 
                        className="h-2 sm:h-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{employee.completed_reviews} of {employee.total_reviews} responses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {activeReviewCycle && (
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-semibold">Recent Reviews</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {(activeReviewCycle as ReviewCycleWithFeedback).feedback_requests?.flatMap(request => 
              request.feedback_responses?.map(response => ({
                ...response,
                employee: employees.find(e => e.id === request.employee_id),
                request_id: request.id
              } as FeedbackResponse))
            )
            .filter((response): response is FeedbackResponse => 
              response !== undefined && 
              Boolean(response.strengths?.trim() || response.areas_for_improvement?.trim())
            )
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
            .slice(0, 4)
            .map((response) => (
              <Card 
                key={response.id}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => response.employee && navigate(`/reviews/${activeReviewCycle.id}/employee/${response.employee.id}`)}
              >
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback>
                          {response.employee?.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">{response.employee?.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground">{response.employee?.role}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {response.relationship.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(response.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    {response.strengths && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Strengths</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {response.strengths}
                        </p>
                      </div>
                    )}
                    {response.areas_for_improvement && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Areas for Improvement</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {response.areas_for_improvement}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Employees */}
      {employees.filter(e => e.total_reviews === 0).length > 0 && (
        <div className="space-y-4 mt-8 pt-8 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-muted-foreground">Other Employees</h2>
            {!activeReviewCycle && (
              <Button
                variant="outline"
                onClick={() => navigate('/reviews/new-cycle')}
                size="sm"
              >
                Start New Review Cycle
              </Button>
            )}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {employees
              .filter(e => e.total_reviews === 0)
              .map((employee) => (
                <Card 
                  key={employee.id}
                  className="group relative hover:shadow-lg transition-all duration-300"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                  </CardContent>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEmployeeToCycle(employee.id);
                      }}
                      className="bg-white text-black hover:bg-white/90"
                      disabled={!activeReviewCycle}
                    >
                      {activeReviewCycle 
                        ? 'Add to Current Cycle' 
                        : 'No Active Cycle'}
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
} 