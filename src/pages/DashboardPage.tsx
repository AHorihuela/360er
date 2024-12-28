import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowRight, Users, Activity,
  CheckCircle, PlusCircle, ExternalLink 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FeedbackResponse {
  id: string;
  status: string;
  submitted_at: string;
}

interface FeedbackRequest {
  id: string;
  status: string;
  employee_id: string;
  target_responses: number;
  feedback_responses: FeedbackResponse[];
}

interface Employee {
  id: string;
  name: string;
  role: string;
  completed_reviews: number;
  total_reviews: number;
}

interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  total_requests: number;
  completed_requests: number;
}

interface ReviewCycleWithFeedback {
  id: string;
  title: string;
  review_by_date: string;
  feedback_requests: FeedbackRequest[];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployees, setHasEmployees] = useState(false);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    async function checkState() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('Fetching data for user:', user.id);

        // Fetch employees with their review status
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, name, role')
          .eq('user_id', user.id);

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          setIsLoading(false);
          return;
        }

        console.log('Employees data:', employeesData);

        const hasEmployees = (employeesData?.length ?? 0) > 0;
        setHasEmployees(hasEmployees);

        // Only fetch review cycles if we have employees
        if (hasEmployees) {
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
                  submitted_at
                )
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('Review cycles query result:', { reviewCycles, cyclesError });

          if (cyclesError) {
            console.error('Error fetching review cycles:', cyclesError);
            setIsLoading(false);
            return;
          }

          if (reviewCycles && reviewCycles.length > 0) {
            const currentCycle = reviewCycles[0] as ReviewCycleWithFeedback;
            console.log('Current cycle:', currentCycle);
            
            // Calculate total completed requests across all employees
            const totalRequests = currentCycle.feedback_requests.reduce((acc: number, fr: FeedbackRequest) => 
              acc + fr.target_responses, 0);
            const completedRequests = currentCycle.feedback_requests.reduce((acc: number, fr: FeedbackRequest) => 
              acc + (fr.feedback_responses?.length ?? 0), 0);

            setActiveReviewCycle({
              id: currentCycle.id,
              title: currentCycle.title,
              review_by_date: currentCycle.review_by_date,
              total_requests: totalRequests,
              completed_requests: completedRequests
            });

            // Process employees with their review status
            const employeesWithStatus = employeesData?.map(employee => {
              const employeeRequest = currentCycle.feedback_requests.find((fr: FeedbackRequest) => fr.employee_id === employee.id);
              return {
                ...employee,
                completed_reviews: employeeRequest?.feedback_responses?.length ?? 0,
                total_reviews: employeeRequest?.target_responses ?? 0
              };
            });

            console.log('Employees with status:', employeesWithStatus);
            setEmployees(employeesWithStatus);
          } else {
            console.log('No active review cycles found');
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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header with Active Review Cycle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {activeReviewCycle 
              ? `Current Review Cycle: ${activeReviewCycle.title}`
              : 'No active review cycle'}
          </p>
        </div>
        <div className="flex gap-4">
          {activeReviewCycle && (
            <Button
              onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
              variant="outline"
              className="hover:bg-black hover:text-white transition-all duration-300"
            >
              View Current Cycle <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => navigate('/reviews/new-cycle')}
            className="bg-black hover:bg-black/90 text-white transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Review Cycle
          </Button>
        </div>
      </div>

      {/* Active Review Cycle Progress */}
      {activeReviewCycle && (
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Cycle Progress</span>
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
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{activeReviewCycle.completed_requests} reviews completed</span>
                <span>{activeReviewCycle.total_requests - activeReviewCycle.completed_requests} pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Review Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(employee => (
          <Card 
            key={employee.id}
            className={`group hover:shadow-lg transition-all duration-300 ${
              employee.completed_reviews === employee.total_reviews 
                ? 'bg-green-50 border-green-100' 
                : employee.completed_reviews > 0 
                  ? 'bg-yellow-50 border-yellow-100'
                  : 'bg-orange-50 border-orange-100'
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <CardDescription>{employee.role}</CardDescription>
                  </div>
                </div>
                {employee.completed_reviews === employee.total_reviews ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Activity className="h-5 w-5 text-orange-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Reviews Submitted</span>
                  <span className="font-medium">
                    {employee.completed_reviews} / {employee.total_reviews}
                  </span>
                </div>
                <Progress 
                  value={(employee.completed_reviews / employee.total_reviews) * 100} 
                  className={`h-2 ${
                    employee.completed_reviews === employee.total_reviews 
                      ? 'bg-green-100' 
                      : employee.completed_reviews > 0 
                        ? 'bg-yellow-100'
                        : 'bg-orange-100'
                  }`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{employee.completed_reviews} completed</span>
                  <span>{employee.total_reviews - employee.completed_reviews} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 