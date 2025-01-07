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
import {
  ReviewCycleWithFeedback,
  DashboardEmployee,
  DashboardFeedbackResponse
} from '@/types/feedback/dashboard';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployees, setHasEmployees] = useState(false);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycleWithFeedback | null>(null);
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);

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
    
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          role,
          user_id,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        toast({
          title: 'Error fetching employees',
          description: employeesError.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const hasEmployeesData = (employeesData?.length ?? 0) > 0;
      setHasEmployees(hasEmployeesData);

      // Initialize employees with 0 reviews
      const employeesWithReviews = employeesData?.map(emp => ({
        ...emp,
        completed_reviews: 0,
        total_reviews: 0
      })) || [];

      setEmployees(employeesWithReviews);

      if (!hasEmployeesData) {
        setIsLoading(false);
        return;
      }

      // Only fetch review cycles if we have employees
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
            unique_link,
            feedback_responses (
              id,
              status,
              submitted_at,
              relationship,
              strengths,
              areas_for_improvement,
              feedback_request_id
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cyclesError) {
        console.error('Error fetching review cycles:', cyclesError);
        toast({
          title: 'Error fetching review cycles',
          description: cyclesError.message,
          variant: 'destructive',
        });
      } else if (reviewCycles && reviewCycles.length > 0) {
        const cycle = reviewCycles[0];
        const totalRequests = cycle.feedback_requests.reduce((acc, fr) => acc + fr.target_responses, 0);
        const completedRequests = cycle.feedback_requests.reduce((acc, fr) => 
          acc + (fr.feedback_responses?.length ?? 0), 0);

        setActiveReviewCycle({
          id: cycle.id,
          title: cycle.title,
          review_by_date: cycle.review_by_date,
          feedback_requests: cycle.feedback_requests,
          total_requests: totalRequests,
          completed_requests: completedRequests
        });

        // Update employees with their review status
        const employeesWithStatus = employeesData.map(employee => {
          const employeeRequest = cycle.feedback_requests.find(fr => fr.employee_id === employee.id);
          return {
            ...employee,
            completed_reviews: employeeRequest?.feedback_responses?.length ?? 0,
            total_reviews: employeeRequest?.target_responses ?? 0
          };
        });
        setEmployees(employeesWithStatus);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
                  {activeReviewCycle.total_requests === 0 ? '0' : Math.round((activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100)}%
                </span>
              </div>
              <Progress 
                value={activeReviewCycle.total_requests === 0 ? 0 : (activeReviewCycle.completed_requests / activeReviewCycle.total_requests) * 100} 
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
                            {employee.name.split(' ').map((n: string) => n[0]).join('')}
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
                          {employee.total_reviews === 0 ? '0' : Math.round((employee.completed_reviews / employee.total_reviews) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={employee.total_reviews === 0 ? 0 : (employee.completed_reviews / employee.total_reviews) * 100} 
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
              request.feedback_responses?.map(response => {
                const feedbackResponse = {
                  id: response.id,
                  feedback_request_id: request.id,
                  relationship: response.relationship,
                  strengths: response.strengths,
                  areas_for_improvement: response.areas_for_improvement,
                  submitted_at: response.submitted_at,
                  status: response.status,
                  employee: employees.find(e => e.id === request.employee_id) ? {
                    id: request.employee_id,
                    name: employees.find(e => e.id === request.employee_id)!.name,
                    role: employees.find(e => e.id === request.employee_id)!.role
                  } : undefined
                } as DashboardFeedbackResponse;
                return feedbackResponse;
              })
            )
            .filter((response): response is DashboardFeedbackResponse => 
              response !== null && typeof response === 'object' && 'id' in response
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
                          {employee.name.split(' ').map((n: string) => n[0]).join('')}
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