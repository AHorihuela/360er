import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ReviewCycle, FeedbackRequest, FeedbackResponse } from '@/types/review';
import { 
  DashboardEmployee, 
  ReviewCycleWithFeedback, 
  DashboardFeedbackResponse, 
  DashboardFeedbackRequest 
} from '@/types/feedback/dashboard';
import { FeedbackStatus, RelationshipType } from '@/types/feedback/base';
import { useAuth } from '@/hooks/useAuth';
import { generateShortId } from '../utils/uniqueId';
import { type DashboardCompetency } from '@/types/feedback/dashboard';
import { ReviewCycleType } from '@/types/survey';

// Extended ReviewCycle type that includes user information for master account mode
type ReviewCycleWithUser = ReviewCycle & {
  users?: {
    email: string;
  };
};

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

export function useDashboardData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isMasterAccount, viewingAllAccounts } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycleWithFeedback | null>(null);
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [employeesData, setEmployeesData] = useState<DashboardEmployee[]>([]);
  const [allReviewCycles, setAllReviewCycles] = useState<ReviewCycleWithUser[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => {
    return localStorage.getItem('selectedCycleId');
  });
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  useEffect(() => {
    async function initialLoad() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
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
  }, [navigate, toast]);
  
  // Wait for auth to be ready and all master account checks to complete
  useEffect(() => {
    if (!isUserLoaded || !user?.id) {
      return;
    }
    
    // Mark as auth ready once user is loaded and master account status is available
    setIsAuthReady(true);
  }, [isUserLoaded, user?.id]);

  
  // Single effect for data fetching with debounce
  useEffect(() => {
    if (!isAuthReady || !user?.id) return;
    
    // Debounce multiple rapid calls
    const timer = setTimeout(() => {
      fetchData();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isAuthReady, viewingAllAccounts, isMasterAccount, user?.id]);

  const fetchData = async (): Promise<void> => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      let employeeQuery = supabase
        .from('employees')
        .select('*');
      
      const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterByUser) {
        employeeQuery = employeeQuery.eq('user_id', user.id);
      }
      
      const { data: employeesData, error: employeesError } = await employeeQuery;
 
      if (employeesError) {
        console.error('[DASHBOARD] Error fetching employees:', employeesError);
        toast({
          title: 'Error fetching employees',
          description: employeesError.message,
          variant: 'destructive',
        });
      } else if (employeesData) {
        setEmployeesData(employeesData as DashboardEmployee[]);
      }
  
      let cyclesQuery;
      
      if (!shouldFilterByUser) {
        // Master account mode - fetch cycles without user join first
        console.log('[DASHBOARD] Fetching in master mode - showing all accounts');
        cyclesQuery = supabase
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
      } else {
        // Regular user mode - no user email needed
        cyclesQuery = supabase
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
          .order('created_at', { ascending: false })
          .eq('user_id', user.id);
      }
      
      const { data: reviewCycles, error: cyclesError } = await cyclesQuery;

      if (cyclesError) {
        console.error('[DASHBOARD] Error fetching review cycles:', cyclesError);
        toast({
          title: 'Error fetching review cycles',
          description: cyclesError.message,
          variant: 'destructive',
        });
      } else if (reviewCycles) {
        // Transform and process the cycles data
        let cyclesWithUsers = reviewCycles.map(cycle => ({
          ...cycle,
          userEmail: null // Will be populated below for master mode
        }));

        // If in master account mode, fetch user emails for cycles not owned by current user
        if (!shouldFilterByUser && reviewCycles.length > 0) {
          const otherUserIds = [...new Set(
            reviewCycles
              .filter(cycle => cycle.user_id !== user.id)
              .map(cycle => cycle.user_id)
          )];

          if (otherUserIds.length > 0) {
            const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
            
            if (usersError) {
              console.error('[DASHBOARD] Error fetching user emails for master mode:', usersError);
            } else if (users?.users) {
              const userEmailMap = users.users.reduce((acc, authUser) => {
                if (authUser.id && authUser.email) {
                  acc[authUser.id] = authUser.email;
                }
                return acc;
              }, {} as Record<string, string>);

              // Update cycles with user emails
              cyclesWithUsers = reviewCycles.map(cycle => ({
                ...cycle,
                userEmail: cycle.user_id !== user.id ? userEmailMap[cycle.user_id] || null : null
              }));
            }
          }
        }

        setAllReviewCycles(cyclesWithUsers);
        
        // Auto-select cycle logic - Process through mapping to ensure complete data
        let cycleToSelect: typeof cyclesWithUsers[0] | null = null;
        
        if (selectedCycleId) {
          cycleToSelect = cyclesWithUsers.find(c => c.id === selectedCycleId) || null;
          if (!cycleToSelect) {
            // Selected cycle not found in available cycles, auto-select most recent
            console.warn('[DASHBOARD] Selected cycle not found, auto-selecting most recent');
            cycleToSelect = cyclesWithUsers.length > 0 ? cyclesWithUsers[0] : null;
          }
        } else if (cyclesWithUsers.length > 0) {
          // Auto-select most recent cycle
          cycleToSelect = cyclesWithUsers[0];
        }

        if (cycleToSelect && cycleToSelect.feedback_requests) {
          // Process the selected cycle through mapping to ensure complete data
          const {
            mappedRequests,
            totalRequests,
            completedRequests,
            employeesWithStatus
          } = mapFeedbackRequestsToDashboard({
            id: cycleToSelect.id,
            title: cycleToSelect.title,
            review_by_date: cycleToSelect.review_by_date,
            feedback_requests: cycleToSelect.feedback_requests
          }, employeesData);

          setActiveReviewCycle({
            id: cycleToSelect.id,
            title: cycleToSelect.title,
            review_by_date: cycleToSelect.review_by_date,
            feedback_requests: mappedRequests,
            total_requests: totalRequests,
            completed_requests: completedRequests
          });

          if (employeesWithStatus) {
            setEmployees(employeesWithStatus);
          }

          // Fetch survey questions if cycle has a type
          if (cycleToSelect.type) {
            fetchSurveyQuestions(cycleToSelect.type);
          }
        } else {
          setActiveReviewCycle(null);
        }
      }
    } catch (error) {
      console.error('[DASHBOARD] Critical error in fetchData:', error);
      toast({
        title: 'Error loading dashboard data',
        description: 'Please try refreshing the page',
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

      // Fetch survey questions if cycle has a type
      if (selectedCycle.type) {
        fetchSurveyQuestions(selectedCycle.type);
      }
    } else {
      console.warn('[DASHBOARD] Cycle not found in current data, may need refresh:', { 
        cycleId, 
        availableCycles: allReviewCycles.length,
        isMasterMode: isMasterAccount && viewingAllAccounts 
      });
      if (isMasterAccount && viewingAllAccounts) {
        fetchData();
      } else {
        setActiveReviewCycle(null);
      }
    }
  };

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
      const uniqueLink = generateShortId();

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

  const fetchSurveyQuestions = async (cycleType: ReviewCycleType) => {
    try {
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

  useEffect(() => {
    if (selectedCycleId && !activeReviewCycle && allReviewCycles.length > 0) {
      const cycle = allReviewCycles.find(c => c.id === selectedCycleId);
      if (cycle) {
        handleCycleChange(selectedCycleId);
      } else {
        if (!isMasterAccount || !viewingAllAccounts) {
          localStorage.removeItem('selectedCycleId');
          setSelectedCycleId(null);
        }
      }
    }
  }, [selectedCycleId, activeReviewCycle, allReviewCycles, isMasterAccount, viewingAllAccounts]);

  useEffect(() => {
    if (selectedCycleId && allReviewCycles.length > 0) {
      const cycleExists = allReviewCycles.some(c => c.id === selectedCycleId);
      if (!cycleExists) {
        if (!isMasterAccount || !viewingAllAccounts) {
          localStorage.removeItem('selectedCycleId');
          setSelectedCycleId(null);
        }
      }
    }
  }, [allReviewCycles, selectedCycleId, isMasterAccount, viewingAllAccounts]);

  // Get the current cycle's user email for display in master mode
  const currentCycleUserEmail = isMasterAccount && viewingAllAccounts && activeReviewCycle
    ? allReviewCycles.find(c => c.id === activeReviewCycle.id)?.users?.email
    : null;

  // Get the current cycle's user_id
  const currentCycleUserId = activeReviewCycle
    ? allReviewCycles.find(c => c.id === activeReviewCycle.id)?.user_id
    : null;

  return {
    isLoading,
    activeReviewCycle,
    employees,
    employeesData,
    allReviewCycles,
    selectedCycleId,
    surveyQuestions,
    isQuestionsLoading,
    isUserLoaded,
    user,
    isMasterAccount,
    viewingAllAccounts,
    currentCycleUserEmail,
    currentCycleUserId,
    handleCycleChange,
    handleAddEmployeeToCycle,
    fetchData
  };
} 