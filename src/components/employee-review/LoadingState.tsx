import { Loader2, Brain, CheckCircle2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ANALYSIS_STAGES, DETAILED_ANALYSIS_STAGES } from "@/constants/feedback";
import { cn } from "@/lib/utils";

interface Props {
  stage: number;
  substep?: keyof typeof DETAILED_ANALYSIS_STAGES.PROCESSING.substeps;
}

export function LoadingState({ stage, substep }: Props) {
  // Map the old stage number to the new detailed stages
  const stageKey = Object.keys(DETAILED_ANALYSIS_STAGES)[Math.min(stage, Object.keys(DETAILED_ANALYSIS_STAGES).length - 1)] as keyof typeof DETAILED_ANALYSIS_STAGES;
  const currentStage = DETAILED_ANALYSIS_STAGES[stageKey];
  const progress = ((stage + 1) / ANALYSIS_STAGES.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          <CardTitle>Analyzing Feedback</CardTitle>
        </div>
        <CardDescription>
          {currentStage.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stage {stage + 1} of {ANALYSIS_STAGES.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {(Object.entries(DETAILED_ANALYSIS_STAGES) as Array<[keyof typeof DETAILED_ANALYSIS_STAGES, typeof DETAILED_ANALYSIS_STAGES[keyof typeof DETAILED_ANALYSIS_STAGES]]>).map(([key, info]) => {
            const isActive = stage === info.step;
            const isComplete = stage > info.step;
            const isProcessing = key === 'PROCESSING' && isActive;

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-gray-200 shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm transition-colors duration-200",
                    isComplete && "text-muted-foreground",
                    isActive && "text-primary font-medium"
                  )}>
                    {info.message}
                  </span>
                </div>

                {isProcessing && substep && 'substeps' in info && (
                  <div className="ml-6 pl-2 border-l border-border">
                    {Object.entries(info.substeps).map(([subKey, message]) => {
                      const isSubActive = substep === subKey;
                      const isSubComplete = Object.keys(info.substeps).indexOf(subKey) < 
                        Object.keys(info.substeps).indexOf(substep);

                      return (
                        <div key={subKey} className="flex items-center gap-2 py-1">
                          {isSubComplete ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          ) : isSubActive ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-gray-200 shrink-0" />
                          )}
                          <span className={cn(
                            "text-xs",
                            isSubComplete && "text-muted-foreground",
                            isSubActive && "text-primary"
                          )}>
                            {message}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 