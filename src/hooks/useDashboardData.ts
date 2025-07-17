import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { DashboardEmployee } from '@/types/feedback/dashboard';
import { useAuth } from '@/hooks/useAuth';
import { generateShortId } from '../utils/uniqueId';
import { useEmployeesData } from './useEmployeesData';
import { useReviewCyclesData } from './useReviewCyclesData';
import { useSurveyQuestions } from './useSurveyQuestions';
import { useCycleSelection } from './useCycleSelection';
import { mapFeedbackRequestsToDashboard } from '@/utils/dashboardUtils';

export function useDashboardData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isMasterAccount, viewingAllAccounts } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Use focused hooks for specific concerns
  const employeesHook = useEmployeesData(user?.id, isMasterAccount, viewingAllAccounts);
  const cyclesHook = useReviewCyclesData(user?.id, isMasterAccount, viewingAllAccounts);
  const questionsHook = useSurveyQuestions();
  const cycleSelectionHook = useCycleSelection();
  
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
      
      // Fetch data using focused hooks
      const [employeesData, reviewCycles] = await Promise.all([
        employeesHook.fetchEmployeesData(),
        cyclesHook.fetchReviewCyclesData()
      ]);

      // Update employees with status information
      if (employeesData) {
        setEmployees(employeesData.map(employee => ({
          ...employee,
          completed_reviews: 0,
          total_reviews: 0
        })));
      }

      // Auto-select cycle logic
      let cycleToSelect = null;
      
      if (cycleSelectionHook.selectedCycleId) {
        cycleToSelect = reviewCycles.find(c => c.id === cycleSelectionHook.selectedCycleId);
        if (!cycleToSelect) {
          // Selected cycle not found in available cycles, auto-select most recent
          console.warn('[DASHBOARD] Selected cycle not found, auto-selecting most recent');
          cycleToSelect = reviewCycles.length > 0 ? reviewCycles[0] : null;
        }
      } else if (reviewCycles.length > 0) {
        // Auto-select most recent cycle
        cycleToSelect = reviewCycles[0];
      }

      if (cycleToSelect) {
        cycleSelectionHook.processSelectedCycle(
          cycleToSelect, 
          employeesData, 
          questionsHook.fetchSurveyQuestions
        );

        // Update employees with status from the selected cycle
        const { employeesWithStatus } = mapFeedbackRequestsToDashboard({
          id: cycleToSelect.id,
          title: cycleToSelect.title,
          review_by_date: cycleToSelect.review_by_date,
          feedback_requests: cycleToSelect.feedback_requests
        }, employeesData);

        if (employeesWithStatus) {
          setEmployees(employeesWithStatus);
        }
      } else {
        cycleSelectionHook.setActiveReviewCycle(null);
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
    const selectedCycle = cycleSelectionHook.handleCycleChange(
      cycleId, 
      cyclesHook.allReviewCycles, 
      employeesHook.employeesData, 
      questionsHook.fetchSurveyQuestions
    );
    
    if (selectedCycle && selectedCycle.feedback_requests) {
      // Update employees with status from the selected cycle
      const { employeesWithStatus } = mapFeedbackRequestsToDashboard({
        id: selectedCycle.id,
        title: selectedCycle.title,
        review_by_date: selectedCycle.review_by_date,
        feedback_requests: selectedCycle.feedback_requests
      }, employeesHook.employeesData);

      if (employeesWithStatus) {
        setEmployees(employeesWithStatus);
      }
    } else {
      console.warn('[DASHBOARD] Cycle not found in current data, may need refresh:', { 
        cycleId, 
        availableCycles: cyclesHook.allReviewCycles.length,
        isMasterMode: isMasterAccount && viewingAllAccounts 
      });
      if (isMasterAccount && viewingAllAccounts) {
        fetchData();
      } else {
        cycleSelectionHook.setActiveReviewCycle(null);
      }
    }
  };

  async function handleAddEmployeeToCycle(employeeId: string) {
    if (!cycleSelectionHook.activeReviewCycle) {
      toast({
        title: "No active cycle",
        description: "Please create a review cycle first",
        variant: "destructive",
      });
      return;
    }

    try {
      const uniqueLink = cycleSelectionHook.activeReviewCycle.type === 'manager_to_employee' ? null : generateShortId();

      const { error: insertError } = await supabase
        .from('feedback_requests')
        .insert({
          employee_id: employeeId,
          review_cycle_id: cycleSelectionHook.activeReviewCycle.id,
          status: 'pending',
          target_responses: cycleSelectionHook.activeReviewCycle.type === 'manager_to_employee' ? 0 : 10,
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

  useEffect(() => {
    if (cycleSelectionHook.selectedCycleId && !cycleSelectionHook.activeReviewCycle && cyclesHook.allReviewCycles.length > 0) {
      const cycle = cyclesHook.allReviewCycles.find(c => c.id === cycleSelectionHook.selectedCycleId);
      if (cycle) {
        handleCycleChange(cycleSelectionHook.selectedCycleId);
      } else {
        if (!isMasterAccount || !viewingAllAccounts) {
          cycleSelectionHook.clearSelectedCycle();
        }
      }
    }
  }, [cycleSelectionHook.selectedCycleId, cycleSelectionHook.activeReviewCycle, cyclesHook.allReviewCycles, isMasterAccount, viewingAllAccounts]);

  useEffect(() => {
    if (cycleSelectionHook.selectedCycleId && cyclesHook.allReviewCycles.length > 0) {
      const cycleExists = cyclesHook.allReviewCycles.some(c => c.id === cycleSelectionHook.selectedCycleId);
      if (!cycleExists) {
        if (!isMasterAccount || !viewingAllAccounts) {
          cycleSelectionHook.clearSelectedCycle();
        }
      }
    }
  }, [cyclesHook.allReviewCycles, cycleSelectionHook.selectedCycleId, isMasterAccount, viewingAllAccounts]);

  // Get the current cycle's user email for display in master mode
  const currentCycleUserEmail = isMasterAccount && viewingAllAccounts && cycleSelectionHook.activeReviewCycle
    ? cyclesHook.allReviewCycles.find(c => c.id === cycleSelectionHook.activeReviewCycle?.id)?.userEmail
    : null;

  // Get the current cycle's user_id
  const currentCycleUserId = cycleSelectionHook.activeReviewCycle
    ? cyclesHook.allReviewCycles.find(c => c.id === cycleSelectionHook.activeReviewCycle?.id)?.user_id
    : null;

  return {
    isLoading: isLoading || employeesHook.isLoading || cyclesHook.isLoading,
    activeReviewCycle: cycleSelectionHook.activeReviewCycle,
    employees,
    employeesData: employeesHook.employeesData,
    allReviewCycles: cyclesHook.allReviewCycles,
    selectedCycleId: cycleSelectionHook.selectedCycleId,
    surveyQuestions: questionsHook.surveyQuestions,
    isQuestionsLoading: questionsHook.isQuestionsLoading,
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