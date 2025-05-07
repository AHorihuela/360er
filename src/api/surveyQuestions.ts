import { supabase } from '@/lib/supabase';
import { ReviewCycleType, SurveyQuestion } from '@/types/survey';

/**
 * Fetch survey questions by review cycle type
 * @param type The type of review cycle
 * @returns An array of survey questions
 */
export async function getSurveyQuestions(type: ReviewCycleType): Promise<SurveyQuestion[]> {
  const { data, error } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('review_cycle_type', type)
    .order('order', { ascending: true });
  
  if (error) {
    console.error('Error fetching survey questions:', error);
    throw error;
  }
  
  // Parse the options JSON if it exists
  return data.map(question => ({
    ...question,
    options: question.options ? JSON.parse(JSON.stringify(question.options)) : undefined,
    reviewCycleType: question.review_cycle_type as ReviewCycleType,
  }));
}

/**
 * Submit structured survey responses
 * @param feedbackRequestId The ID of the feedback request
 * @param relationship The relationship type
 * @param responses The structured responses
 * @returns The created feedback response
 */
export async function submitSurveyResponses(
  feedbackRequestId: string,
  relationship: string,
  responses: Record<string, string | number>,
  sessionId: string
) {
  // Determine if there are open-ended responses that need to go into strengths/areas_for_improvement
  // This maintains backward compatibility with the existing system
  const strengthsQuestion = await supabase
    .from('survey_questions')
    .select('*')
    .eq('review_cycle_type', '360_review')
    .eq('question_text', 'What are this person\'s strengths?')
    .single();
  
  const areasQuestion = await supabase
    .from('survey_questions')
    .select('*')
    .eq('review_cycle_type', '360_review')
    .eq('question_text', 'What are areas for improvement for this person?')
    .single();
  
  // Extract strengths and areas for improvement if they exist in the responses
  const strengths = strengthsQuestion?.data?.id ? responses[strengthsQuestion.data.id] as string : '';
  const areas_for_improvement = areasQuestion?.data?.id ? responses[areasQuestion.data.id] as string : '';
  
  const { data, error } = await supabase
    .from('feedback_responses')
    .insert({
      feedback_request_id: feedbackRequestId,
      relationship,
      responses,
      strengths,
      areas_for_improvement,
      session_id: sessionId,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting survey responses:', error);
    throw error;
  }
  
  return data;
}

/**
 * Analyze manager effectiveness responses
 * @param feedbackRequestId The ID of the feedback request
 * @returns Analytics for the manager effectiveness survey
 */
export async function analyzeManagerEffectivenessResponses(feedbackRequestId: string) {
  // Get the feedback request to check if it's a manager effectiveness survey
  const { data: request, error: requestError } = await supabase
    .from('feedback_requests')
    .select(`
      *,
      review_cycle:review_cycles(*)
    `)
    .eq('id', feedbackRequestId)
    .single();
  
  if (requestError) {
    console.error('Error fetching feedback request:', requestError);
    throw requestError;
  }
  
  if (request?.review_cycle?.type !== 'manager_effectiveness') {
    throw new Error('This is not a manager effectiveness survey');
  }
  
  // Get all responses for this feedback request
  const { data: responses, error: responsesError } = await supabase
    .from('feedback_responses')
    .select('*')
    .eq('feedback_request_id', feedbackRequestId);
  
  if (responsesError) {
    console.error('Error fetching feedback responses:', responsesError);
    throw responsesError;
  }
  
  // Get questions for manager effectiveness surveys
  const { data: questions, error: questionsError } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('review_cycle_type', 'manager_effectiveness')
    .order('order', { ascending: true });
  
  if (questionsError) {
    console.error('Error fetching survey questions:', questionsError);
    throw questionsError;
  }
  
  // Calculate analytics for each question
  const analytics = questions
    .filter(q => q.question_type === 'likert')
    .map(question => {
      const questionResponses = responses
        .filter(r => r.responses && r.responses[question.id] !== undefined)
        .map(r => Number(r.responses[question.id]));
      
      // Calculate average score
      const sum = questionResponses.reduce((acc, val) => acc + val, 0);
      const average = questionResponses.length > 0 ? sum / questionResponses.length : 0;
      
      // Calculate distribution
      const distribution: Record<number, number> = {};
      questionResponses.forEach(score => {
        distribution[score] = (distribution[score] || 0) + 1;
      });
      
      return {
        questionId: question.id,
        questionText: question.question_text,
        averageScore: parseFloat(average.toFixed(2)),
        responseCount: questionResponses.length,
        distribution
      };
    });
  
  // Collect open-ended responses
  const openEndedResponses = questions
    .filter(q => q.question_type === 'open_ended')
    .map(question => {
      const questionResponses = responses
        .filter(r => r.responses && r.responses[question.id] !== undefined)
        .map(r => String(r.responses[question.id]));
      
      return {
        questionId: question.id,
        questionText: question.question_text,
        responses: questionResponses
      };
    });
  
  return {
    analytics,
    openEndedResponses,
    responseCount: responses.length
  };
} 