import { useState, useCallback } from 'react';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

const defaultSteps: AnalysisStep[] = [
  { id: 'initialize', label: 'Initializing analysis...', status: 'pending' },
  { id: 'review', label: 'Reviewing content...', status: 'pending' },
  { id: 'evaluate', label: 'Evaluating feedback...', status: 'pending' },
  { id: 'generate', label: 'Generating suggestions...', status: 'pending' },
  { id: 'finalize', label: 'Finalizing analysis...', status: 'pending' }
];

export function useAnalysisSteps() {
  const [steps, setSteps] = useState<AnalysisStep[]>(defaultSteps);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetSteps = useCallback(() => {
    setSteps(defaultSteps);
  }, []);

  const progressToNextStep = useCallback(() => {
    setSteps(currentSteps => {
      const inProgressIndex = currentSteps.findIndex(step => step.status === 'in_progress');
      if (inProgressIndex >= 0) {
        // Complete the current step and start the next one
        return currentSteps.map((step, index) => {
          if (index === inProgressIndex) {
            return { ...step, status: 'completed' };
          }
          if (index === inProgressIndex + 1) {
            return { ...step, status: 'in_progress' };
          }
          return step;
        });
      } else {
        // Start the first pending step
        const firstPendingIndex = currentSteps.findIndex(step => step.status === 'pending');
        if (firstPendingIndex >= 0) {
          return currentSteps.map((step, index) => 
            index === firstPendingIndex ? { ...step, status: 'in_progress' } : step
          );
        }
      }
      return currentSteps;
    });
  }, []);

  const completeAllSteps = useCallback(() => {
    setSteps(currentSteps => 
      currentSteps.map(step => ({ ...step, status: 'completed' }))
    );
  }, []);

  const markStepsAsError = useCallback(() => {
    setSteps(currentSteps => {
      const inProgressIndex = currentSteps.findIndex(step => step.status === 'in_progress');
      if (inProgressIndex >= 0) {
        return currentSteps.map((step, index) => ({
          ...step,
          status: index === inProgressIndex ? 'error' : step.status
        }));
      }
      return currentSteps;
    });
  }, []);

  return {
    steps,
    progressToNextStep,
    completeAllSteps,
    markStepsAsError,
    resetSteps,
    isAnalyzing,
    setIsAnalyzing
  };
} 