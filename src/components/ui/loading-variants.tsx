// Export all loading components and types
export { LoadingSpinner } from "./loading-spinner";
export type { SpinnerSize, SpinnerColor } from "./loading-spinner";

export { StatusIcon } from "./status-icon";
export type { StatusIconSize, StatusType } from "./status-icon";

export { ProgressSteps, calculateStepsProgress } from "./progress-steps";
export type { ProgressStep, ProgressStepsLayout } from "./progress-steps";

// Re-export useful design tokens
export { 
  sizes, 
  colors, 
  animations, 
  spacing,
  getLoadingColorClasses 
} from "@/styles/design-tokens";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";
import { ProgressSteps, ProgressStep, calculateStepsProgress } from "./progress-steps";
import { Progress } from "./progress";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "./card";
import { spacing } from "@/styles/design-tokens";

// Compound loading container component
interface LoadingContainerProps {
  title?: string;
  description?: string;
  steps?: ProgressStep[];
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function LoadingContainer({
  title = "Loading...",
  description,
  steps,
  showProgress = true,
  size = "md",
  className,
  children
}: LoadingContainerProps) {
  const progress = steps ? calculateStepsProgress(steps) : 0;
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LoadingSpinner size={size} color="primary" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={spacing.loading.container[size]}>
        {showProgress && steps && steps.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
            </div>
            <ProgressSteps steps={steps} />
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

// Simple inline loading component
interface InlineLoadingProps {
  text?: string;
  size?: "xs" | "sm" | "md";
  color?: "primary" | "muted";
  className?: string;
}

export function InlineLoading({
  text = "Loading...",
  size = "sm",
  color = "primary",
  className
}: InlineLoadingProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoadingSpinner size={size} color={color} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

// Button loading state
interface LoadingButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any; // For spreading button props
}

export function LoadingButton({
  isLoading = false,
  loadingText = "Loading...",
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={cn(
        "flex items-center justify-center gap-2",
        className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" color="primary" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
}

// Export compound components
export type { LoadingContainerProps, InlineLoadingProps, LoadingButtonProps }; 