import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { type ReviewCycleType } from '@/types/survey';

/**
 * Custom hook for managing survey questions data
 */
export function useSurveyQuestions() {
  const { toast } = useToast();
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

  const fetchSurveyQuestions = async (cycleType: ReviewCycleType): Promise<Record<string, string>> => {
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
          description: `Could not load survey questions for ${
          cycleType === 'manager_effectiveness' ? 'Manager Survey' : 
          cycleType === 'manager_to_employee' ? 'Manager to Employee Feedback' : 
          '360° Feedback'
        }`,
          variant: "destructive",
        });
        return {};
      }

      const questionMap: Record<string, string> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
      });

      setSurveyQuestions(questionMap);
      console.log(`Loaded ${data.length} questions for survey type: ${cycleType}`);
      return questionMap;
    } catch (err) {
      console.error('Error fetching survey questions:', err);
      toast({
        title: "Error",
        description: "Could not load survey questions. Some question text may not display correctly.",
        variant: "destructive",
      });
      return {};
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  return {
    surveyQuestions,
    isQuestionsLoading,
    fetchSurveyQuestions
  };
} 