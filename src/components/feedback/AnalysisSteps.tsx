import { Brain, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from '@/lib/utils';

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
  const progress = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          <CardTitle>Analyzing Your Feedback</CardTitle>
        </div>
        <CardDescription>
          {error ? 
            'There was an issue analyzing your feedback. Proceeding with submission...' :
            'Our AI is reviewing your feedback to ensure it\'s as helpful as possible...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="w-full" />
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : step.status === 'in_progress' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : step.status === 'error' ? (
                <div className="h-4 w-4 rounded-full bg-red-100 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-gray-100 shrink-0 border border-gray-200" />
              )}
              <span className={cn(
                "text-sm transition-colors duration-200",
                step.status === 'completed' ? 'text-green-600 font-medium' :
                step.status === 'in_progress' ? 'text-primary font-medium' :
                step.status === 'error' ? 'text-red-500' :
                'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 