import { Brain } from 'lucide-react';
import { LoadingContainer, ProgressStep, calculateStepsProgress } from '@/components/ui/loading-variants';

interface Props {
  stage: number;
  substep?: 'SENIOR' | 'PEER' | 'JUNIOR' | 'AGGREGATE';
}

export function LoadingState({ stage, substep }: Props) {
  // Convert stage and substep into ProgressStep format
  const steps: ProgressStep[] = [
    {
      id: 'prepare',
      label: 'Preparing analysis',
      status: stage > 0 ? 'completed' : stage === 0 ? 'in_progress' : 'pending',
      description: 'Setting up AI models and preparing data'
    },
    {
      id: 'processing',
      label: 'Processing feedback',
      status: stage > 1 ? 'completed' : stage === 1 ? 'in_progress' : 'pending',
      description: 'Analyzing feedback content and identifying patterns',
      substeps: [
        {
          id: 'senior',
          label: 'Analyzing senior feedback',
          status: stage > 1 ? 'completed' : 
                 (stage === 1 && substep === 'SENIOR') ? 'in_progress' :
                 (stage === 1 && ['PEER', 'JUNIOR', 'AGGREGATE'].includes(substep || '')) ? 'completed' : 'pending'
        },
        {
          id: 'peer',
          label: 'Analyzing peer feedback',
          status: stage > 1 ? 'completed' : 
                 (stage === 1 && substep === 'PEER') ? 'in_progress' :
                 (stage === 1 && ['JUNIOR', 'AGGREGATE'].includes(substep || '')) ? 'completed' : 'pending'
        },
        {
          id: 'junior',
          label: 'Analyzing junior feedback',
          status: stage > 1 ? 'completed' : 
                 (stage === 1 && substep === 'JUNIOR') ? 'in_progress' :
                 (stage === 1 && substep === 'AGGREGATE') ? 'completed' : 'pending'
        },
        {
          id: 'aggregate',
          label: 'Calculating aggregate insights',
          status: stage > 1 ? 'completed' : 
                 (stage === 1 && substep === 'AGGREGATE') ? 'in_progress' : 'pending'
        }
      ]
    },
    {
      id: 'saving',
      label: 'Saving results',
      status: stage > 2 ? 'completed' : stage === 2 ? 'in_progress' : 'pending',
      description: 'Storing analysis results in the database'
    },
    {
      id: 'complete',
      label: 'Completing analysis',
      status: stage > 3 ? 'completed' : stage === 3 ? 'in_progress' : 'pending',
      description: 'Finalizing and preparing report'
    }
  ];

  return (
    <LoadingContainer
      title="Analyzing Feedback"
      description={steps.find(s => s.status === 'in_progress')?.description || 'Processing feedback analysis'}
      steps={steps}
      showProgress={true}
      size="md"
      className="w-full"
    />
  );
} 