import { LoadingContainer } from '@/components/ui/loading-variants';
import { ProgressStep } from '@/components/ui/progress-steps';

interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface AnalysisStepsProps {
  steps: AnalysisStep[];
  error: string | null;
}

export function AnalysisSteps({ steps, error }: AnalysisStepsProps) {
  // Transform AnalysisStep to ProgressStep format (they're already compatible!)
  const progressSteps: ProgressStep[] = steps.map(step => ({
    id: step.id,
    label: step.label,
    status: step.status
  }));

  const description = error ? 
    'There was an issue analyzing your feedback. Proceeding with submission...' :
    'Our AI is reviewing your feedback to ensure it\'s as helpful as possible...';

  return (
    <LoadingContainer
      title="Analyzing Your Feedback"
      description={description}
      steps={progressSteps}
      showProgress={true}
      size="md"
    />
  );
} 