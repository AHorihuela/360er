import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';
import { generateAIReport } from '../lib/openai';
import { debounce } from 'lodash';
import { FeedbackRequest, AIReportType, GenerationStep } from '../types/reviews/employee-review';
import { cleanMarkdownContent } from '../utils/report';
import { ReviewCycleType } from '../types/survey';

interface UseAIReportManagementProps {
  feedbackRequest: FeedbackRequest | null;
  surveyType?: ReviewCycleType;
  onSuccessfulGeneration?: () => Promise<void>;
}

export function useAIReportManagement({ 
  feedbackRequest, 
  surveyType,
  onSuccessfulGeneration 
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

      setGenerationStep(2);

      const currentTime = new Date().toISOString();
      const formattedReport = reportContent.trim();

      // Update state first to ensure immediate UI update
      setAiReport({
        content: formattedReport,
        created_at: currentTime
      });

      // Update database
      const { error: finalizeError } = await supabase
        .from('ai_reports')
        .update({
          content: formattedReport,
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
      toast({
        title: "Error",
        description: "Failed to generate AI report",
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