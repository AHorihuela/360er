import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, PlusCircle, Users, ArrowRight, ArrowUpIcon, EqualIcon, ArrowDownIcon, StarIcon, TrendingUpIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewCycle, FeedbackRequest, FeedbackResponse } from '@/types/review';
import { DashboardEmployee, ReviewCycleWithFeedback, DashboardFeedbackResponse, DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { FeedbackStatus, RelationshipType } from '@/types/feedback/base';
import { useAuth } from '@/hooks/useAuth';
import { generateShortId } from '../utils/uniqueId';
import { cn } from '@/lib/utils';
import { FeedbackTimeline } from '@/components/dashboard/FeedbackTimeline';
import { type DashboardCompetency } from '@/types/feedback/dashboard';
import { RecentReviews } from '@/components/dashboard/RecentReviews';
import { ReviewCycleType } from '@/types/survey';
import { MasterAccountToggle } from '@/components/ui/MasterAccountToggle';

type ReviewCycleInput = {
  id: string;
  title: string;
  review_by_date: string;
  feedback_requests?: Array<FeedbackRequest & {
    feedback_responses?: FeedbackResponse[];
    analytics?: {
      id: string;
      insights: Array<{
        competencies: Array<DashboardCompetency>;
        relationship: string;
      }>;
    };
  }>;
};

type MapFeedbackResult = {
  mappedRequests: DashboardFeedbackRequest[];
  totalRequests: number;
  completedRequests: number;
  employeesWithStatus: DashboardEmployee[] | undefined;
};

function mapFeedbackRequestsToDashboard(
  reviewCycle: ReviewCycleInput,
  employeesData: DashboardEmployee[] | null
): MapFeedbackResult {
  if (!reviewCycle.feedback_requests) {
    return {
      mappedRequests: [],
      totalRequests: 0,
      completedRequests: 0,
      employeesWithStatus: employeesData?.map(employee => ({
        ...employee,
        completed_reviews: 0,
        total_reviews: 0
      }))
    };
  }

  const totalRequests = reviewCycle.feedback_requests.reduce(
    (acc: number, fr: FeedbackRequest) => acc + fr.target_responses, 
    0
  );
  
  const completedRequests = reviewCycle.feedback_requests.reduce(
    (acc: number, fr: FeedbackRequest) => acc + (fr.feedback_responses?.length ?? 0), 
    0
  );

  const mappedRequests = reviewCycle.feedback_requests.map((fr: FeedbackRequest): DashboardFeedbackRequest => ({
    ...fr,
    employee: Array.isArray(fr.employee) ? fr.employee[0] : fr.employee,
    feedback_responses: fr.feedback_responses?.map((response: FeedbackResponse): DashboardFeedbackResponse => ({
      ...response,
      feedback_request_id: fr.id,
      status: response.status as FeedbackStatus,
      relationship: response.relationship as RelationshipType
    })),
    analytics: fr.analytics ? {
      id: fr.analytics.id,
      insights: fr.analytics.insights.map(insight => ({
        ...insight,
        competencies: insight.competencies.map((comp: DashboardCompetency) => ({
          ...comp,
          evidenceQuotes: comp.evidenceQuotes ?? []
        }))
      }))
    } : undefined
  }));

  const employeesWithStatus = employeesData?.map((employee: DashboardEmployee) => {
    const employeeRequest = reviewCycle.feedback_requests?.find(
      (fr: FeedbackRequest) => fr.employee_id === employee.id
    );
    return {
      ...employee,
      completed_reviews: employeeRequest?.feedback_responses?.length ?? 0,
      total_reviews: employeeRequest?.target_responses ?? 0
    };
  });

  return {
    mappedRequests,
    totalRequests,
    completedRequests,
    employeesWithStatus
  };
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isMasterAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycleWithFeedback | null>(null);
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [employeesData, setEmployeesData] = useState<DashboardEmployee[]>([]);
  const [allReviewCycles, setAllReviewCycles] = useState<ReviewCycle[]>([]);
  const [visibleReviews, setVisibleReviews] = useState<number>(4);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('selectedCycleId');
  });
  // Add state for survey questions
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  // Add state for viewing all accounts
  const [viewingAllAccounts, setViewingAllAccounts] = useState<boolean>(() => {
    const savedState = localStorage.getItem('masterViewingAllAccounts');
    return savedState === 'true';
  });
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  
  useEffect(() => {
    async function initialLoad() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          console.log('[DEBUG] Initial user load:', currentUser.id);
          setIsUserLoaded(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      }
    }
    
    initialLoad();
  }, [navigate]);
  
  useEffect(() => {
    if (!isUserLoaded || !user?.id) return;
    
    console.log('[DEBUG] Fetching data after toggle change:', { viewingAllAccounts });
    fetchData();
  }, [isUserLoaded, viewingAllAccounts, user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      // Employee fetch logic - for master account mode, potentially fetch all employees
      let employeeQuery = supabase
        .from('employees')
        .select('*');
      
      // Only show all employees if master account AND viewing all accounts is enabled
      const shouldFilterEmployeesByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterEmployeesByUser) {
        employeeQuery = employeeQuery.eq('user_id', user.id);
      }
      
      const { data: employeesData, error: employeesError } = await employeeQuery;

      // Review cycles fetch logic - for master account mode, potentially fetch all cycles
      let cyclesQuery = supabase
        .from('review_cycles')
        .select(`
          *,
          feedback_requests (
            id,
            employee_id,
            target_responses,
            feedback_responses (
              id,
              relationship,
              strengths,
              areas_for_improvement,
              submitted_at,
              status,
              responses
            ),
            analytics:feedback_analytics (
              id,
              insights
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      // Only show all cycles if master account AND viewing all accounts is enabled
      const shouldFilterCyclesByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterCyclesByUser) {
        cyclesQuery = cyclesQuery.eq('user_id', user.id);
      }
      
      const { data: reviewCycles, error: cyclesError } = await cyclesQuery;

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        toast({
          title: 'Error fetching employees',
          description: employeesError.message,
          variant: 'destructive',
        });
      } else if (employeesData) {
        setEmployeesData(employeesData as DashboardEmployee[]);
      }

      if (cyclesError) {
        console.error('Error fetching review cycles:', cyclesError);
        toast({
          title: 'Error fetching review cycles',
          description: cyclesError.message,
          variant: 'destructive',
        });
      } else if (reviewCycles && reviewCycles.length > 0) {
        setAllReviewCycles(reviewCycles);
        
        // If no cycle is selected, use the most recent one
        const cycleToShow = selectedCycleId 
          ? reviewCycles.find(c => c.id === selectedCycleId) 
          : reviewCycles[0];

        if (cycleToShow && cycleToShow.feedback_requests) {
          const {
            mappedRequests,
            totalRequests,
            completedRequests,
            employeesWithStatus
          } = mapFeedbackRequestsToDashboard({
            id: cycleToShow.id,
            title: cycleToShow.title,
            review_by_date: cycleToShow.review_by_date,
            feedback_requests: cycleToShow.feedback_requests
          }, employeesData);

          setActiveReviewCycle({
            id: cycleToShow.id,
            title: cycleToShow.title,
            review_by_date: cycleToShow.review_by_date,
            feedback_requests: mappedRequests,
            total_requests: totalRequests,
            completed_requests: completedRequests
          });

          if (employeesWithStatus) {
            setEmployees(employeesWithStatus);
          }
          
          // Fetch survey questions for the active cycle type
          if (cycleToShow.type) {
            fetchSurveyQuestions(cycleToShow.type);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCycleChange = (cycleId: string) => {
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
    const selectedCycle = allReviewCycles.find(c => c.id === cycleId);
    
    if (selectedCycle && selectedCycle.feedback_requests) {
      const {
        mappedRequests,
        totalRequests,
        completedRequests,
        employeesWithStatus
      } = mapFeedbackRequestsToDashboard({
        id: selectedCycle.id,
        title: selectedCycle.title,
        review_by_date: selectedCycle.review_by_date,
        feedback_requests: selectedCycle.feedback_requests
      }, employeesData);

      setActiveReviewCycle({
        id: selectedCycle.id,
        title: selectedCycle.title,
        review_by_date: selectedCycle.review_by_date,
        feedback_requests: mappedRequests,
        total_requests: totalRequests,
        completed_requests: completedRequests
      });

      if (employeesWithStatus) {
        setEmployees(employeesWithStatus);
      }
      
      // Fetch survey questions for the selected cycle type
      if (selectedCycle.type) {
        fetchSurveyQuestions(selectedCycle.type);
      }
    }
  };

  // Clear selected cycle if it doesn't exist in current cycles
  useEffect(() => {
    if (selectedCycleId && allReviewCycles.length > 0) {
      const cycleExists = allReviewCycles.some(c => c.id === selectedCycleId);
      if (!cycleExists) {
        localStorage.removeItem('selectedCycleId');
        setSelectedCycleId(null);
      }
    }
  }, [allReviewCycles, selectedCycleId]);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
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
      // Generate a short unique link
      const uniqueLink = generateShortId();

      // Create a new feedback request for this employee in the current cycle
      const { error: insertError } = await supabase
        .from('feedback_requests')
        .insert({
          employee_id: employeeId,
          review_cycle_id: activeReviewCycle.id,
          status: 'pending',
          target_responses: 10,
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

  // Add function to fetch survey questions
  const fetchSurveyQuestions = async (cycleType: ReviewCycleType) => {
    try {
      // Clear any existing questions first and set loading state
      setSurveyQuestions({});
      setIsQuestionsLoading(true);
      
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text')
        .eq('review_cycle_type', cycleType);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No questions found for survey type: ${cycleType}`);
        toast({
          title: "Warning",
          description: `Could not load survey questions for ${cycleType === 'manager_effectiveness' ? 'Manager Survey' : '360° Feedback'}`,
          variant: "destructive",
        });
        setIsQuestionsLoading(false);
        return;
      }

      // Create a map of question IDs to question text
      const questionMap: Record<string, string> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
      });

      setSurveyQuestions(questionMap);
      console.log(`Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err) {
      console.error('Error fetching survey questions:', err);
      toast({
        title: "Error",
        description: "Could not load survey questions. Some question text may not display correctly.",
        variant: "destructive",
      });
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show onboarding for new users only if they have no employees
  if (!employeesData.length) {
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
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="flex flex-col space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          
          <Select value={selectedCycleId || ''} onValueChange={handleCycleChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select review cycle" />
            </SelectTrigger>
            <SelectContent>
              {allReviewCycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Add the Master Account Toggle here */}
        <MasterAccountToggle 
          viewingAllAccounts={viewingAllAccounts} 
          setViewingAllAccounts={setViewingAllAccounts} 
        />

        {/* Active Review Cycle Progress */}
        {activeReviewCycle && (
          <>
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

            {/* Analytics Grid */}
            {activeReviewCycle.feedback_requests.some(fr => fr.feedback_responses && fr.feedback_responses.length > 0) && (
              <div className="space-y-6">
                {/* Response Timeline */}
                <FeedbackTimeline 
                  feedbackRequests={activeReviewCycle.feedback_requests}
                  dueDate={activeReviewCycle.review_by_date}
                  totalReviews={activeReviewCycle.total_requests}
                  pendingReviews={activeReviewCycle.total_requests - activeReviewCycle.completed_requests}
                />

                {/* Link to Analytics */}
                <Card 
                  onClick={() => navigate('/analytics')}
                  className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Team Competency Analysis</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      View detailed competency analysis and insights for your team
                    </p>
                  </CardHeader>
                </Card>

                {/* Display the appropriate review section based on cycle type */}
                {(() => {
                  // Get the current cycle type
                  const cycleType = allReviewCycles.find(c => c.id === activeReviewCycle.id)?.type || '360_review';
                  console.log("Current cycle type:", cycleType);
                  
                  // For manager effectiveness survey
                  if (cycleType === 'manager_effectiveness') {
                    console.log("Using manager effectiveness display");
                    
                    // Add employee information to feedback requests
                    const enhancedRequests = activeReviewCycle.feedback_requests.map(request => {
                      // Find the employee data for this request
                      const employee = employees.find(e => e.id === request.employee_id);
                      
                      // Return a new request object with employee data attached
                      return {
                        ...request,
                        employee: employee ? {
                          id: employee.id,
                          name: employee.name,
                          role: employee.role
                        } : undefined
                      };
                    });
                    
                    console.log("Enhanced requests with employee data:", 
                      enhancedRequests.map(r => ({ 
                        id: r.id, 
                        employee_id: r.employee_id, 
                        employee_name: r.employee?.name 
                      }))
                    );
                    
                    return (
                      <div>
                        <RecentReviews 
                          feedbackRequests={enhancedRequests}
                          questionIdToTextMap={surveyQuestions}
                          reviewCycleType='manager_effectiveness'
                          reviewCycleId={activeReviewCycle.id}
                        />
                      </div>
                    );
                  }
                  
                  // For 360 reviews, show the original implementation
                  return (
                    <div className="space-y-4 mt-8 pt-8 border-t">
                      <h2 className="text-xl font-semibold">Recent Reviews</h2>
                      <div className="grid gap-6 md:grid-cols-2">
                        {activeReviewCycle.feedback_requests
                          .flatMap(fr => (fr.feedback_responses || []).map(response => ({
                            ...response,
                            employee_id: fr.employee_id
                          })))
                          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                          .slice(0, visibleReviews)
                          .map((response) => {
                            // Find the employee from the employees array
                            const employee = employees.find(e => e.id === response.employee_id);
                            if (!employee) return null;

                            return (
                              <Card 
                                key={response.id}
                                className={cn(
                                  "hover:shadow-lg transition-all duration-300 cursor-pointer",
                                  response.relationship === 'senior_colleague' && 'border-blue-100',
                                  response.relationship === 'equal_colleague' && 'border-green-100',
                                  response.relationship === 'junior_colleague' && 'border-purple-100'
                                )}
                                onClick={() => navigate(`/reviews/${activeReviewCycle.id}/employee/${response.employee_id}`)}
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
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs sm:text-sm text-muted-foreground">{employee.role}</p>
                                          <Badge variant="outline" className={cn(
                                            "text-xs capitalize flex items-center gap-1",
                                            response.relationship === 'senior_colleague' && 'bg-blue-50 border-blue-200',
                                            response.relationship === 'equal_colleague' && 'bg-green-50 border-green-200',
                                            response.relationship === 'junior_colleague' && 'bg-purple-50 border-purple-200'
                                          )}>
                                            {response.relationship === 'senior_colleague' && <ArrowUpIcon className="h-3 w-3" />}
                                            {response.relationship === 'equal_colleague' && <EqualIcon className="h-3 w-3" />}
                                            {response.relationship === 'junior_colleague' && <ArrowDownIcon className="h-3 w-3" />}
                                            {response.relationship.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs text-muted-foreground block">
                                        {new Date(response.submitted_at).toLocaleDateString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground mt-1 block">
                                        Review #{employee.completed_reviews}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-4 mt-4">
                                    {response.strengths && (
                                      <div className="bg-slate-50 p-3 rounded-md">
                                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                          <StarIcon className="h-4 w-4 text-yellow-500" />
                                          Strengths
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {response.strengths}
                                        </p>
                                      </div>
                                    )}
                                    {response.areas_for_improvement && (
                                      <div className="bg-slate-50 p-3 rounded-md">
                                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                          <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                          Areas for Improvement
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {response.areas_for_improvement}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-4 flex justify-end">
                                    {employee.completed_reviews === 1 && (
                                      <Badge variant="secondary" className="text-xs">First Review</Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                          .filter(Boolean)
                        }
                      </div>
                      {activeReviewCycle.feedback_requests
                        .flatMap(fr => fr.feedback_responses || [])
                        .length > visibleReviews && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setVisibleReviews(prev => prev + 4)}
                            className="w-full sm:w-auto"
                          >
                            Load More Reviews
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
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

        {/* Other Employees */}
        {activeReviewCycle && employeesData
          .filter(employee => !activeReviewCycle.feedback_requests.some(fr => fr.employee_id === employee.id))
          .length > 0 && (
          <div className="space-y-4 mt-8 pt-8 border-t">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-muted-foreground">Other Employees</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {employeesData
                .filter(employee => !activeReviewCycle.feedback_requests.some(fr => fr.employee_id === employee.id))
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
                      >
                        Add to Current Cycle
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 