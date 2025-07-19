import * as React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sizes, colors } from "@/styles/design-tokens";
import { LoadingSpinner } from "./loading-spinner";

// Status icon size variants using design tokens
export const statusIconSizeVariants = {
  sm: sizes.statusIcon.sm,
  md: sizes.statusIcon.md,
  lg: sizes.statusIcon.lg,
} as const;

// Status variants with their colors and icons
export const statusVariants = {
  completed: {
    icon: CheckCircle2,
    color: colors.loading.success.spinner,
    testId: "status-completed"
  },
  in_progress: {
    icon: LoadingSpinner,
    color: colors.loading.primary.spinner,
    testId: "status-in-progress"
  },
  pending: {
    icon: "circle",
    color: "border-gray-200 bg-background",
    testId: "status-pending"
  },
  error: {
    icon: AlertCircle,
    color: colors.loading.error.spinner,
    testId: "status-error"
  },
  cancelled: {
    icon: X,
    color: colors.loading.error.spinner,
    testId: "status-cancelled"
  }
} as const;

type StatusIconSize = keyof typeof statusIconSizeVariants;
type StatusType = keyof typeof statusVariants;

interface StatusIconProps {
  status: StatusType;
  size?: StatusIconSize;
  className?: string;
  "data-testid"?: string;
}

export function StatusIcon({ 
  status, 
  size = "sm", 
  className,
  "data-testid": testId
}: StatusIconProps) {
  const variant = statusVariants[status];
  const sizeClass = statusIconSizeVariants[size];
  const defaultTestId = testId || variant.testId;

  // Handle in_progress status with spinner
  if (status === "in_progress") {
    return (
      <LoadingSpinner
        size={size}
        color="primary"
        className={className}
        data-testid={defaultTestId}
      />
    );
  }

  // Handle pending status with empty circle
  if (status === "pending") {
    return (
      <div 
        className={cn(
          sizeClass,
          "rounded-full border",
          variant.color,
          "shrink-0",
          className
        )}
        data-testid={defaultTestId}
      />
    );
  }

  // Handle other statuses with lucide icons
  const IconComponent = variant.icon as React.ComponentType<{ className?: string }>;
  
  return (
    <IconComponent 
      className={cn(
        sizeClass,
        variant.color,
        "shrink-0",
        className
      )}
      data-testid={defaultTestId}
    />
  );
}

// Export types for other components to use
export type { StatusIconSize, StatusType }; 