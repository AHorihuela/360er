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
  }, [navigate, toast]);
  
  // Consolidated effect that waits for both auth and user data to be ready
  useEffect(() => {
    // Mark auth as ready when we have user state and master account status is determined
    if (isUserLoaded && user?.id) {
      // Small delay to ensure master account status has been checked
      const timer = setTimeout(() => {
        setIsAuthReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isUserLoaded, user?.id, isMasterAccount]);
  
  // Single effect for data fetching with debounce
  useEffect(() => {
    if (!isAuthReady || !user?.id) return;
    
    console.log('[DEBUG] Auth ready, fetching data:', { 
      viewingAllAccounts, 
      isMasterAccount, 
      isUserLoaded,
      userId: user?.id 
    });
    
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
      
      console.log('[DEBUG] Starting fetch with selectedCycleId:', selectedCycleId, 'viewingAllAccounts:', viewingAllAccounts, 'isMasterAccount:', isMasterAccount);
      
      let employeeQuery = supabase
        .from('employees')
        .select('*');
      
      const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterByUser) {
        employeeQuery = employeeQuery.eq('user_id', user.id);
      }
      
      const { data: employeesData, error: employeesError } = await employeeQuery;
 
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        toast({
          title: 'Error fetching employees',
          description: employeesError.message,
          variant: 'destructive',
        });
      } else if (employeesData) {
        console.log('[DEBUG] Employees data loaded, count:', employeesData.length);
        setEmployeesData(employeesData as DashboardEmployee[]);
      }
  
      let cyclesQuery;
      
      if (!shouldFilterByUser) {
        // Master account mode - fetch cycles without user join first
        console.log('[DEBUG] Fetching ALL cycles in master mode');
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
        console.log('[DEBUG] Filtering cycles by user:', user.id);
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
        console.error('Error fetching review cycles:', cyclesError);
        toast({
          title: 'Error fetching review cycles',
          description: cyclesError.message,
          variant: 'destructive',
        });
      }
      
      let cyclesWithUsers: ReviewCycleWithUser[] = [];
      
      if (reviewCycles && reviewCycles.length > 0) {
        console.log('[DEBUG] Review cycles loaded, count:', reviewCycles.length, 'cycles');
        
        if (!shouldFilterByUser) {
          // For master account mode, manually fetch user emails
          const userIds = [...new Set(reviewCycles.map(cycle => cycle.user_id).filter(Boolean))];
          
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .rpc('get_user_emails', { user_ids: userIds });
              
            if (usersError) {
              console.warn('Error fetching user emails:', usersError);
              // Continue without user emails
              cyclesWithUsers = reviewCycles;
            } else {
              // Map user emails to cycles
              cyclesWithUsers = reviewCycles.map(cycle => ({
                ...cycle,
                users: usersData?.find((user: { id: string; email: string }) => user.id === cycle.user_id) 
                  ? { email: usersData.find((user: { id: string; email: string }) => user.id === cycle.user_id)!.email }
                  : undefined
              }));
            }
          } else {
            cyclesWithUsers = reviewCycles;
          }
        } else {
          cyclesWithUsers = reviewCycles;
        }
        
        console.log('[DEBUG] Cycles loaded:', cyclesWithUsers.map(c => ({ id: c.id, title: c.title, user_id: c.user_id })));
        
        setAllReviewCycles(cyclesWithUsers);
        
        let cycleToShow = null;
        
        // If we have a selectedCycleId, try to find it in the available cycles
        if (selectedCycleId) {
          cycleToShow = cyclesWithUsers.find(c => c.id === selectedCycleId);
          
          // If the selected cycle is not found (e.g., when switching from master mode back to user mode)
          // automatically select the user's most recent cycle
          if (!cycleToShow) {
            console.log('[DEBUG] Selected cycle not found in available cycles, auto-selecting most recent');
            cycleToShow = cyclesWithUsers[0]; // Most recent cycle (ordered by created_at desc)
            if (cycleToShow) {
              console.log('[DEBUG] Auto-selecting cycle after mode switch:', cycleToShow.id, cycleToShow.title);
              setSelectedCycleId(cycleToShow.id);
              localStorage.setItem('selectedCycleId', cycleToShow.id);
            }
          }
        } else {
          // No selectedCycleId, select the most recent cycle
          cycleToShow = cyclesWithUsers[0];
          if (cycleToShow) {
            console.log('[DEBUG] Auto-selecting most recent cycle:', cycleToShow.id);
            setSelectedCycleId(cycleToShow.id);
            localStorage.setItem('selectedCycleId', cycleToShow.id);
          }
        }

        if (cycleToShow) {
          console.log('[DEBUG] Selected cycle:', cycleToShow.id, cycleToShow.title);
        } else if (selectedCycleId) {
          console.log('[DEBUG] Selected cycle not found in loaded cycles. Selected ID:', selectedCycleId);
        }

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
    console.log('[DEBUG] Cycle selection changed to:', cycleId);
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
    const selectedCycle = allReviewCycles.find(c => c.id === cycleId);
    
    if (selectedCycle && selectedCycle.feedback_requests) {
      console.log('[DEBUG] Processing selected cycle:', selectedCycle.title);
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
      
      if (selectedCycle.type) {
        fetchSurveyQuestions(selectedCycle.type);
      }
    } else {
      console.warn('[DEBUG] Selected cycle not found in current cycles list. ID:', cycleId);
      if (isMasterAccount && viewingAllAccounts) {
        console.log('[DEBUG] In master mode, refreshing data to find missing cycle');
        fetchData();
      } else {
        console.log('[DEBUG] Cycle not found and not in master mode - clearing active cycle');
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
      console.log('[DEBUG] Trying to restore active cycle from selectedCycleId');
      const cycle = allReviewCycles.find(c => c.id === selectedCycleId);
      if (cycle) {
        handleCycleChange(selectedCycleId);
      } else {
        console.log('[DEBUG] Selected cycle not found in current cycles list');
        if (isMasterAccount && viewingAllAccounts) {
          console.log('[DEBUG] In master mode, will keep selection until data refresh completes');
        } else {
          console.log('[DEBUG] Clearing cycle selection as it no longer exists');
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
          console.log('[DEBUG] Selected cycle not found in available cycles - clearing selection');
          localStorage.removeItem('selectedCycleId');
          setSelectedCycleId(null);
        } else {
          console.log('[DEBUG] Cycle not found but in master mode - keeping selection');
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