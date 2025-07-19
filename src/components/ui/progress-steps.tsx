import * as React from "react";
import { cn } from "@/lib/utils";
import { spacing, typography } from "@/styles/design-tokens";
import { StatusIcon, StatusType, StatusIconSize } from "./status-icon";

// Step interface
export interface ProgressStep {
  id: string;
  label: string;
  status: StatusType;
  description?: string;
  substeps?: ProgressStep[];
}

// Progress steps variants
export const progressStepsVariants = {
  vertical: "space-y-3",
  horizontal: "flex items-center space-x-4",
} as const;

type ProgressStepsLayout = keyof typeof progressStepsVariants;

interface ProgressStepsProps {
  steps: ProgressStep[];
  layout?: ProgressStepsLayout;
  size?: StatusIconSize;
  showDescriptions?: boolean;
  className?: string;
  "data-testid"?: string;
}

interface StepItemProps {
  step: ProgressStep;
  size: StatusIconSize;
  showDescriptions: boolean;
  isSubstep?: boolean;
}

function StepItem({ step, size, showDescriptions, isSubstep = false }: StepItemProps) {
  const textColor = cn(
    "transition-colors duration-200",
    step.status === 'completed' && "text-muted-foreground",
    step.status === 'in_progress' && "text-primary font-medium",
    step.status === 'error' && "text-red-500",
    step.status === 'cancelled' && "text-red-500",
    step.status === 'pending' && "text-muted-foreground"
  );

  return (
    <div className={cn(isSubstep && "ml-6 pl-2 border-l border-border")}>
      <div className="flex items-center gap-3">
        <StatusIcon
          status={step.status}
          size={size}
          data-testid={`step-${step.id}-icon`}
        />
        <div className="flex-1 min-w-0">
          <span className={cn(typography.badge, textColor)} data-testid={`step-${step.id}-label`}>
            {step.label}
          </span>
          {showDescriptions && step.description && (
            <p className={cn("text-xs text-muted-foreground mt-1")} data-testid={`step-${step.id}-description`}>
              {step.description}
            </p>
          )}
        </div>
      </div>

      {/* Render substeps if they exist */}
      {step.substeps && step.substeps.length > 0 && (
        <div className="mt-2 space-y-2">
          {step.substeps.map((substep) => (
            <StepItem
              key={substep.id}
              step={substep}
              size={size}
              showDescriptions={showDescriptions}
              isSubstep={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressSteps({ 
  steps,
  layout = "vertical",
  size = "sm",
  showDescriptions = true,
  className,
  "data-testid": testId = "progress-steps"
}: ProgressStepsProps) {
  if (layout === "horizontal") {
    return (
      <div 
        className={cn(progressStepsVariants.horizontal, className)}
        data-testid={testId}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <StatusIcon
                status={step.status}
                size={size}
                data-testid={`step-${step.id}-icon`}
              />
              <span className={cn(
                typography.badge,
                "whitespace-nowrap",
                step.status === 'completed' && "text-muted-foreground",
                step.status === 'in_progress' && "text-primary font-medium"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-border min-w-4" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div 
      className={cn(progressStepsVariants.vertical, className)}
      data-testid={testId}
    >
      {steps.map((step) => (
        <StepItem
          key={step.id}
          step={step}
          size={size}
          showDescriptions={showDescriptions}
        />
      ))}
    </div>
  );
}

// Helper function to calculate progress percentage
export function calculateStepsProgress(steps: ProgressStep[]): number {
  if (steps.length === 0) return 0;
  
  const totalSteps = steps.reduce((acc, step) => {
    return acc + 1 + (step.substeps?.length || 0);
  }, 0);
  
  const completedSteps = steps.reduce((acc, step) => {
    let count = step.status === 'completed' ? 1 : 0;
    if (step.substeps) {
      count += step.substeps.filter(substep => substep.status === 'completed').length;
    }
    return acc + count;
  }, 0);
  
  return Math.round((completedSteps / totalSteps) * 100);
}

// Export types for other components to use
export type { ProgressStepsLayout }; 