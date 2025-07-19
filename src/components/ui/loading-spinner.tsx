import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sizes, colors, animations } from "@/styles/design-tokens";

// Spinner size variants using design tokens
export const spinnerSizeVariants = {
  xs: sizes.spinner.xs,
  sm: sizes.spinner.sm, 
  md: sizes.spinner.md,
  lg: sizes.spinner.lg,
  xl: sizes.spinner.xl,
} as const;

// Spinner color variants using design tokens
export const spinnerColorVariants = {
  primary: colors.loading.primary.spinner,
  muted: colors.loading.muted.spinner,
  success: colors.loading.success.spinner,
  error: colors.loading.error.spinner,
  warning: colors.loading.warning.spinner,
} as const;

type SpinnerSize = keyof typeof spinnerSizeVariants;
type SpinnerColor = keyof typeof spinnerColorVariants;

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  "data-testid"?: string;
}

export function LoadingSpinner({ 
  size = "sm", 
  color = "primary", 
  className,
  "data-testid": testId = "loading-spinner"
}: LoadingSpinnerProps) {
  return (
    <Loader2 
      className={cn(
        spinnerSizeVariants[size],
        spinnerColorVariants[color],
        animations.loading.spin,
        "shrink-0",
        className
      )}
      data-testid={testId}
    />
  );
}

// Export types for other components to use
export type { SpinnerSize, SpinnerColor }; 