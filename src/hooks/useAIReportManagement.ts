import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { generateAIReport } from '@/lib/openai';
import { debounce } from 'lodash';
import { FeedbackRequest, AIReportType, GenerationStep } from '@/types/reviews/employee-review';
import { cleanMarkdownContent } from '@/utils/report';

interface UseAIReportManagementProps {
  feedbackRequest: FeedbackRequest | null;
}

export function useAIReportManagement({ feedbackRequest }: UseAIReportManagementProps) {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<AIReportType | null>(null);
  const [generationStep, setGenerationStep] = useState<GenerationStep>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setIsGeneratingReport(true);
      setGenerationStep(0);
      setStartTime(Date.now());

      // First check if we have a recent analysis
      const { data: existingReport } = await supabase
        .from('ai_reports')
        .select('content, updated_at, status')
        .eq('feedback_request_id', feedbackRequest.id)
        .eq('is_final', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // If we have a recent report (less than 1 hour old) and it's completed, use it
      if (existingReport?.status === 'completed' && 
          existingReport?.content &&
          new Date(existingReport.updated_at).getTime() > Date.now() - 3600000) {
        console.log('Using existing recent report');
        setAiReport({
          content: existingReport.content,
          created_at: existingReport.updated_at
        });
        setIsGeneratingReport(false);
        setStartTime(null);
        return;
      }

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

      // Generate new report
      console.log('Calling OpenAI to generate report...');
      const reportContent = await generateAIReport(
        feedbackRequest.employee?.name || 'Unknown Employee',
        feedbackRequest.employee?.role || 'Unknown Role',
        feedbackRequest.feedback
      );

      if (!reportContent) {
        throw new Error('Failed to generate report content');
      }

      const currentTime = new Date().toISOString();
      const formattedReport = reportContent.trim();

      // Update state
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

      toast({
        title: "Success",
        description: "AI report generated successfully",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
      setStartTime(null);
    }
  };

  // Add interval for real-time elapsed time updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && isGeneratingReport) {
      interval = setInterval(() => {
        // Force re-render to update elapsed time
        setStartTime(prev => prev);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startTime, isGeneratingReport]);

  return {
    isGeneratingReport,
    aiReport,
    generationStep,
    startTime,
    error,
    handleReportChange,
    handleGenerateReport,
    setAiReport
  };
} 