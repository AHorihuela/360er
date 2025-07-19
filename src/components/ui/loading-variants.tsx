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
  size?: "sm" | "default" | "lg" | "icon";
  [key: string]: any; // For spreading button props
}

export function LoadingButton({
  isLoading = false,
  loadingText = "Loading...",
  children,
  className,
  size = "default",
  ...props
}: LoadingButtonProps) {
  const sizeClasses = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9"
  };

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={cn(
        // Base button styles matching shadcn Button component
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        "gap-2", // For spacing between spinner and text
        className
      )}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" color="primary" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Export compound components
export type { LoadingContainerProps, InlineLoadingProps, LoadingButtonProps }; 