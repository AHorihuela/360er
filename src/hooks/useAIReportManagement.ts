import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';
import { generateAIReport } from '../lib/openai';
import { debounce } from 'lodash';
import { FeedbackRequest, AIReportType, GenerationStep } from '../types/reviews/employee-review';
import { cleanMarkdownContent } from '../utils/report';
import { ReviewCycleType } from '../types/survey';
import { CoreFeedbackResponse } from '../types/feedback/base';

interface UseAIReportManagementProps {
  feedbackRequest: FeedbackRequest | null;
  surveyType?: ReviewCycleType;
  onSuccessfulGeneration?: () => Promise<void>;
  surveyQuestions?: Record<string, string>;
  surveyQuestionOrder?: Record<string, number>;
}

export function useAIReportManagement({ 
  feedbackRequest, 
  surveyType,
  onSuccessfulGeneration,
  surveyQuestions,
  surveyQuestionOrder
}: UseAIReportManagementProps) {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<AIReportType | null>(() => {
    // Initialize with existing report if available
    const existingReport = feedbackRequest?.ai_reports?.[0];
    return existingReport ? {
      content: existingReport.content,
      created_at: existingReport.updated_at
    } : null;
  });
  const [generationStep, setGenerationStep] = useState<GenerationStep>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [abortController] = useState(() => new AbortController());

  // Update aiReport when feedbackRequest.ai_reports changes
  useEffect(() => {
    if (feedbackRequest?.ai_reports?.[0]) {
      setAiReport({
        content: feedbackRequest.ai_reports[0].content,
        created_at: feedbackRequest.ai_reports[0].updated_at
      });
    }
  }, [feedbackRequest?.ai_reports]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isGeneratingReport) {
        abortController.abort();
        setIsGeneratingReport(false);
        setGenerationStep(0);
        setStartTime(null);
        setElapsedSeconds(0);
        setError(null);
      }
    };
  }, [isGeneratingReport, abortController]);

  // Add debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (!feedbackRequest) return;
      
      try {
        // Only clean up extra hashes while preserving heading structure
        const cleanContent = cleanMarkdownContent(content);

        const { error: saveError } = await supabase
          .from('ai_reports')
          .update({
            content: cleanContent,
            updated_at: new Date().toISOString()
          })
          .eq('feedback_request_id', feedbackRequest.id);

        if (saveError) {
          setError('Failed to save report changes');
          throw saveError;
        }
      } catch (err) {
        console.error('Error saving report:', err);
        toast({
          title: "Error",
          description: "Failed to save report changes",
          variant: "destructive",
        });
      }
    }, 1000),
    [feedbackRequest, toast]
  );

  const handleReportChange = useCallback((value: string) => {
    const cleanValue = cleanMarkdownContent(value);
    
    setAiReport(prev => ({
      content: cleanValue,
      created_at: prev?.created_at || new Date().toISOString()
    }));
    debouncedSave(cleanValue);
  }, [debouncedSave]);

  const handleGenerateReport = async () => {
    if (!feedbackRequest?.id || !feedbackRequest.feedback?.length) return;

    try {
      // Reset state
      setError(null);
      setIsGeneratingReport(true);
      setGenerationStep(0);
      setStartTime(Date.now());
      setElapsedSeconds(0);

      // Check if already aborted
      if (abortController.signal.aborted) {
        setIsGeneratingReport(false);
        setGenerationStep(0);
        return;
      }

      // Debug: Log current authentication state
      console.log('Debug: Starting report generation for:', {
        feedbackRequestId: feedbackRequest.id,
        hasResponses: feedbackRequest.feedback?.length > 0
      });

      // Verify user authentication before proceeding
      let currentSession = null;
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      console.log('Debug: Initial session check:', { session: !!session, authError });

      if (authError || !session) {
        // Try to refresh the session
        console.log('Session not found, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        console.log('Debug: Session refresh attempt:', { 
          refreshedSession: !!refreshedSession, 
          refreshError 
        });
        
        if (refreshError || !refreshedSession) {
          // Try one more time with a sign-in check
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          console.log('Debug: User check:', { user: !!user, userError });
          
          if (userError || !user) {
            throw new Error('User not authenticated. Please log out and log back in.');
          }
          
          throw new Error('Session expired. Please refresh the page and try again.');
        }
        
        console.log('Session refreshed successfully');
        currentSession = refreshedSession;
      } else {
        currentSession = session;
      }

      console.log('Debug: Using session for user:', currentSession.user.id);

      // Verify user has access to the feedback request
      const { data: verifyData, error: verifyError } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          review_cycles!inner(user_id)
        `)
        .eq('id', feedbackRequest.id)
        .single();

      console.log('Debug: Access verification:', { 
        verifyData: !!verifyData, 
        verifyError,
        reviewCycleOwner: verifyData ? (verifyData.review_cycles as any).user_id : null,
        currentUser: currentSession.user.id
      });

      if (verifyError || !verifyData) {
        throw new Error('Access denied: Cannot access this feedback request.');
      }

      // Check if user owns the feedback request OR is a master account (in dev mode)
      const isOwner = (verifyData.review_cycles as any).user_id === currentSession.user.id;
      
      if (!isOwner) {
        // In development mode, check if user is a master account
        if (import.meta.env.DEV) {
          console.log('Debug: Checking master account status for development bypass...');
          
          try {
            const { data: masterCheck, error: masterError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', currentSession.user.id)
              .eq('role', 'master')
              .single();
            
            if (!masterError && masterCheck) {
              console.log('Debug: Development bypass granted - user is master account');
              // Continue with report generation
            } else {
              throw new Error('Access denied: You do not own this feedback request.');
            }
          } catch (error) {
            throw new Error('Access denied: You do not own this feedback request.');
          }
        } else {
          throw new Error('Access denied: You do not own this feedback request.');
        }
      }

      setGenerationStep(1);

      // Create or update the report entry
      const { error: initError } = await supabase
        .from('ai_reports')
        .upsert({
          feedback_request_id: feedbackRequest.id,
          status: 'processing',
          is_final: false,
          updated_at: new Date().toISOString()
        });

      if (initError) throw initError;

      // Check if aborted
      if (abortController.signal.aborted) {
        setIsGeneratingReport(false);
        setGenerationStep(0);
        return;
      }

      // Generate new report
      console.log('Calling OpenAI to generate report...');
      const reportContent = await generateAIReport(
        feedbackRequest.employee?.name || 'Unknown Employee',
        feedbackRequest.employee?.role || 'Unknown Role',
        feedbackRequest.feedback,
        surveyType
      );

      if (!reportContent) {
        throw new Error('Failed to generate report content');
      }

      // Check if aborted
      if (abortController.signal.aborted) {
        setIsGeneratingReport(false);
        setGenerationStep(0);
        return;
      }

      // Charts will be generated during PDF export only, not embedded in markdown
      const finalReportContent = reportContent;

      setGenerationStep(3); // Final step - saving report

      const currentTime = new Date().toISOString();

      // Update state first to ensure immediate UI update
      setAiReport({
        content: finalReportContent,
        created_at: currentTime
      });

      // Update database
      const { error: finalizeError } = await supabase
        .from('ai_reports')
        .update({
          content: finalReportContent,
          status: 'completed',
          is_final: true,
          updated_at: currentTime
        })
        .eq('feedback_request_id', feedbackRequest.id);

      if (finalizeError) throw finalizeError;

      // Refresh data from the parent component if callback provided
      if (onSuccessfulGeneration) {
        await onSuccessfulGeneration();
      }

      // Only reset states after successful completion
      setIsGeneratingReport(false);
      setGenerationStep(0);
      setStartTime(null);
      setElapsedSeconds(0);

      // Show success toast after UI is updated
      toast({
        title: "Report generated successfully",
        description: "The AI report has been generated and is now visible below.",
        variant: "default"
      });

    } catch (error) {
      console.error('Error generating report:', error);
      setGenerationStep(0);
      setIsGeneratingReport(false);
      setStartTime(null);
      setElapsedSeconds(0);
      
      // Update error message to include the actual error message
      const errorMessage = error instanceof Error 
        ? `Error generating report: ${error.message}` 
        : 'Failed to generate AI report';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Replace the existing interval effect with this improved version
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && isGeneratingReport) {
      interval = setInterval(() => {
        // Calculate elapsed time since start
        const elapsed = Math.floor((Date.now() - (startTime || 0)) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      // Don't reset state on unmount - only if we're still mounted and generation is complete
      if (!interval && startTime && isGeneratingReport) {
        setIsGeneratingReport(false);
        setStartTime(null);
        setElapsedSeconds(0);
      }
    };
  }, [startTime, isGeneratingReport]);

  return {
    isGeneratingReport,
    aiReport,
    generationStep,
    startTime,
    elapsedSeconds,
    error,
    handleReportChange,
    handleGenerateReport,
    setAiReport
  };
} 