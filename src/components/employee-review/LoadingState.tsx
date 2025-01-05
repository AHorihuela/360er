import { Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYSIS_STAGES } from "@/constants/feedback";

interface Props {
  stage: number;
}

export function LoadingState({ stage }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-primary">
            {ANALYSIS_STAGES[stage]}
          </p>
          <div className="w-full max-w-xs space-y-2">
            <Progress 
              value={((stage + 1) / ANALYSIS_STAGES.length) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Stage {stage + 1} of {ANALYSIS_STAGES.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 