import { useState, useEffect, useCallback } from 'react';

interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

const INITIAL_STEPS: AnalysisStep[] = [
  { id: 'init', label: 'Initializing analysis...', status: 'pending' },
  { id: 'review', label: 'Reviewing feedback content...', status: 'pending' },
  { id: 'evaluate', label: 'Evaluating quality and actionability...', status: 'pending' },
  { id: 'suggest', label: 'Generating improvement suggestions...', status: 'pending' },
  { id: 'finalize', label: 'Finalizing analysis...', status: 'pending' }
];

export function useAnalysisSteps(isAnalyzing: boolean) {
  const [steps, setSteps] = useState<AnalysisStep[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Reset steps when analysis starts
  useEffect(() => {
    if (isAnalyzing) {
      console.log('Analysis started - resetting steps');
      setSteps(INITIAL_STEPS);
      setCurrentStepIndex(0);
      
      // Set first step to in progress
      setSteps(prevSteps => prevSteps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'in_progress' as const : 'pending' as const
      })));
    }
  }, [isAnalyzing]);

  const progressToNextStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= INITIAL_STEPS.length) return prev;
      
      console.log(`Progressing to step ${nextIndex}: ${INITIAL_STEPS[nextIndex].label}`);
      
      setSteps(prevSteps => prevSteps.map((step, index) => ({
        ...step,
        status: index === nextIndex ? 'in_progress' as const
               : index < nextIndex ? 'completed' as const
               : 'pending' as const
      })));
      
      return nextIndex;
    });
  }, []);

  const completeAllSteps = useCallback(() => {
    console.log('Completing all steps');
    setSteps(prevSteps => prevSteps.map(step => ({
      ...step,
      status: 'completed' as const
    })));
  }, []);

  const markStepsAsError = useCallback(() => {
    console.log('Marking steps as error');
    setSteps(prevSteps => prevSteps.map(step => ({
      ...step,
      status: step.status === 'completed' ? 'completed' as const : 'error' as const
    })));
  }, []);

  const resetSteps = useCallback(() => {
    console.log('Resetting steps');
    setCurrentStepIndex(-1);
    setSteps(INITIAL_STEPS);
  }, []);

  return {
    steps,
    progressToNextStep,
    completeAllSteps,
    markStepsAsError,
    resetSteps
  };
} 