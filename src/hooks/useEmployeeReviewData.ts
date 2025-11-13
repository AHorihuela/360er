import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { ReviewCycle, FeedbackRequest } from '@/types/reviews/employee-review';
import { ReviewCycleType } from '@/types/survey';

interface UseEmployeeReviewDataProps {
  cycleId: string;
  employeeId: string;
  onNavigateBack: () => void;
}

interface UseEmployeeReviewDataReturn {
  isLoading: boolean;
  error: string | null;
  reviewCycle: ReviewCycle | null;
  feedbackRequest: FeedbackRequest | null;
  surveyQuestions: Record<string, string>;
  surveyQuestionOrder: Record<string, number>;
  isQuestionsLoading: boolean;
  fetchData: () => Promise<void>;
  fetchSurveyQuestions: (cycleType: ReviewCycleType) => Promise<void>;
  setFeedbackRequest: (request: FeedbackRequest | null) => void;
  getQuestionTextById: (questionId: string) => string;
}

export function useEmployeeReviewData({
  cycleId,
  employeeId,
  onNavigateBack
}: UseEmployeeReviewDataProps): UseEmployeeReviewDataReturn {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [surveyQuestionOrder, setSurveyQuestionOrder] = useState<Record<string, number>>({});
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

  // Get question text by ID using the fetched questions from the database
  const getQuestionTextById = useCallback((questionId: string): string => {
    if (surveyQuestions[questionId]) {
      return surveyQuestions[questionId];
    }
    
    // Fallback if question not found
    return `Question ${questionId.slice(0, 8)}...`;
  }, [surveyQuestions]);

  // Fetch survey questions based on the review cycle type
  const fetchSurveyQuestions = useCallback(async (cycleType: ReviewCycleType) => {
    // Manager-to-employee cycles don't use structured survey questions
    if (cycleType === 'manager_to_employee') {
      console.log('Skipping survey questions for manager-to-employee cycle - uses direct feedback input');
      setSurveyQuestions({});
      setSurveyQuestionOrder({});
      setIsQuestionsLoading(false);
      return;
    }

    try {
      // Clear any existing questions first and set loading state
      setSurveyQuestions({});
      setSurveyQuestionOrder({});
      setIsQuestionsLoading(true);
      
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text, order')
        .eq('review_cycle_type', cycleType)
        .order('order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No questions found for survey type: ${cycleType}`);
        toast({
          title: "Warning",
          description: `Could not load survey questions for ${
          cycleType === 'manager_effectiveness' ? 'Manager Survey' : 
          '360° Feedback'
        }`,
          variant: "destructive",
        });
        setIsQuestionsLoading(false);
        return;
      }

      // Create a map of question IDs to question text and order
      const questionMap: Record<string, string> = {};
      const orderMap: Record<string, number> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
        orderMap[question.id] = question.order;
      });

      setSurveyQuestions(questionMap);
      setSurveyQuestionOrder(orderMap);
      console.log(`Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err: any) {
      console.error('Error fetching survey questions:', err);
      toast({
        title: "Error",
        description: "Could not load survey questions. Some question text may not display correctly.",
        variant: "destructive",
      });
      
      // Retry once after a short delay
      setTimeout(() => {
        console.log('Retrying survey question fetch...');
        fetchSurveyQuestionsRetry(cycleType);
      }, 2000);
    } finally {
      setIsQuestionsLoading(false);
    }
  }, [toast]);
  
  // Retry function with simplified error handling
  const fetchSurveyQuestionsRetry = useCallback(async (cycleType: ReviewCycleType) => {
    try {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text, order')
        .eq('review_cycle_type', cycleType)
        .order('order', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.warn(`Retry: No questions found for survey type: ${cycleType}`);
        return;
      }

      // Create a map of question IDs to question text and order
      const questionMap: Record<string, string> = {};
      const orderMap: Record<string, number> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
        orderMap[question.id] = question.order;
      });

      setSurveyQuestions(questionMap);
      setSurveyQuestionOrder(orderMap);
      console.log(`Retry successful: Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err) {
      console.error('Error in retry fetch for survey questions:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!cycleId || !employeeId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select(`
          *,
          feedback_requests (
            id,
            employee_id,
            status,
            target_responses,
            unique_link,
            feedback_responses (
              id,
              submitted_at,
              relationship,
              strengths,
              areas_for_improvement,
              created_at,
              responses
            ),
            ai_reports (
              content,
              updated_at
            )
          )
        `)
        .eq('id', cycleId)
        .eq('feedback_requests.employee_id', employeeId)
        .single();

      if (cycleError) throw cycleError;

      // Fetch employee data separately to avoid relationship issues
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      const request = cycleData.feedback_requests[0];
      setReviewCycle(cycleData);
      setFeedbackRequest({
        ...request,
        employee: employeeData, // Manually link employee data
        feedback: request.feedback_responses,
        _count: {
          responses: request.feedback_responses?.length || 0,
          page_views: 0,
          unique_viewers: 0
        }
      });

      // Once we have the review cycle data, fetch the survey questions
      if (cycleData.type) {
        fetchSurveyQuestions(cycleData.type);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load employee review details');
      toast({
        title: "Error",
        description: "Failed to load employee review details",
        variant: "destructive",
      });
      onNavigateBack();
    } finally {
      setIsLoading(false);
    }
  }, [cycleId, employeeId, onNavigateBack, toast]);

  return {
    isLoading,
    error,
    reviewCycle,
    feedbackRequest,
    surveyQuestions,
    surveyQuestionOrder,
    isQuestionsLoading,
    fetchData,
    fetchSurveyQuestions,
    setFeedbackRequest,
    getQuestionTextById
  };
} 