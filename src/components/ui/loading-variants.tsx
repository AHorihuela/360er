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
import { AlertTriangle, XCircle, AlertCircle, Info } from "lucide-react";

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

// ============================================================================
// ERROR HANDLING COMPONENTS
// ============================================================================

// Error message component for inline error text
interface ErrorMessageProps {
  message: string;
  size?: "sm" | "md";
  className?: string;
}

export function ErrorMessage({
  message,
  size = "sm",
  className
}: ErrorMessageProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base"
  };

  return (
    <p className={cn(
      "text-destructive font-medium",
      sizeClasses[size],
      className
    )}>
      {message}
    </p>
  );
}

// Error container for more prominent error states
interface ErrorContainerProps {
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info";
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ErrorContainer({
  title,
  message,
  variant = "error",
  showIcon = true,
  className,
  children
}: ErrorContainerProps) {
  const variants = {
    error: {
      container: "border-red-200 bg-red-50",
      text: "text-red-800",
      icon: XCircle,
      iconColor: "text-red-500"
    },
    warning: {
      container: "border-amber-200 bg-amber-50",
      text: "text-amber-800",
      icon: AlertTriangle,
      iconColor: "text-amber-500"
    },
    info: {
      container: "border-blue-200 bg-blue-50",
      text: "text-blue-800",
      icon: Info,
      iconColor: "text-blue-500"
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border p-4",
      config.container,
      className
    )}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
        )}
        <div className="flex-1 space-y-2">
          {title && (
            <h3 className={cn("font-semibold", config.text)}>
              {title}
            </h3>
          )}
          <p className={cn("text-sm", config.text)}>
            {message}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

// Error state component for full page/section errors
interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className
}: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center space-y-4 py-8",
      className
    )}>
      <div className="rounded-full bg-red-100 p-3">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>
      {action}
    </div>
  );
}

// Form field error component
interface FieldErrorProps {
  error?: string | string[];
  className?: string;
}

export function FieldError({
  error,
  className
}: FieldErrorProps) {
  if (!error) return null;

  const errors = Array.isArray(error) ? error : [error];

  return (
    <div className={cn("space-y-1", className)}>
      {errors.map((err, index) => (
        <ErrorMessage key={index} message={err} size="sm" />
      ))}
    </div>
  );
}

// Export compound components
export type { 
  LoadingContainerProps, 
  InlineLoadingProps, 
  LoadingButtonProps,
  ErrorMessageProps,
  ErrorContainerProps,
  ErrorStateProps,
  FieldErrorProps
}; 