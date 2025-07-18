import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewCycleType } from "@/types/survey";
import { 
  getStatusColorClasses, 
  getNeutralColorClasses, 
  getConfidenceColorClasses,
  getRelationshipColorClasses,
  getFeatureColorClasses,
  typography 
} from "@/styles/design-tokens";

// Status badge variants using design tokens
export const statusBadgeVariants = {
  completed: getStatusColorClasses('completed'),
  active: getStatusColorClasses('active'),
  inProgress: getStatusColorClasses('inProgress'),
  overdue: getStatusColorClasses('overdue'),
  warning: getStatusColorClasses('warning'),
  draft: getStatusColorClasses('draft'),
} as const;

// Cycle type badge variants - all use neutral styling
export const cycleTypeBadgeVariants = {
  "360_review": getNeutralColorClasses(),
  "manager_effectiveness": getNeutralColorClasses(), 
  "manager_to_employee": getNeutralColorClasses(),
} as const;

// Confidence level badge variants
export const confidenceBadgeVariants = {
  high: getConfidenceColorClasses('high'),
  medium: getConfidenceColorClasses('medium'),
  low: getConfidenceColorClasses('low'),
} as const;

// Relationship type badge variants
export const relationshipBadgeVariants = {
  senior: getRelationshipColorClasses('senior'),
  peer: getRelationshipColorClasses('peer'),
  junior: getRelationshipColorClasses('junior'),
} as const;

// Feature/beta badge variants
export const featureBadgeVariants = {
  beta: getFeatureColorClasses('beta'),
  warning: getFeatureColorClasses('warning'),
} as const;

type StatusVariant = keyof typeof statusBadgeVariants;
type CycleTypeVariant = keyof typeof cycleTypeBadgeVariants;
type ConfidenceVariant = keyof typeof confidenceBadgeVariants;
type RelationshipVariant = keyof typeof relationshipBadgeVariants;
type FeatureVariant = keyof typeof featureBadgeVariants;

interface StatusBadgeProps {
  status: string;
  className?: string;
  children: React.ReactNode;
}

interface CycleTypeBadgeProps {
  type: ReviewCycleType;
  className?: string;
  children: React.ReactNode;
}

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low';
  className?: string;
  children: React.ReactNode;
}

interface RelationshipBadgeProps {
  type: 'senior' | 'peer' | 'junior';
  className?: string;
  children: React.ReactNode;
}

interface FeatureBadgeProps {
  type: 'beta' | 'warning';
  className?: string;
  children: React.ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  const getVariant = (status: string): StatusVariant => {
    const statusMap: Record<string, StatusVariant> = {
      'Completed': 'completed',
      'Active': 'active', 
      'In Progress': 'inProgress',
      'Overdue': 'overdue',
      'Warning': 'warning',
      'Draft': 'draft',
    };
    return statusMap[status] || 'inProgress';
  };

  const variant = getVariant(status);
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        typography.badge,
        "flex-shrink-0",
        statusBadgeVariants[variant],
        className
      )}
    >
      {children}
    </Badge>
  );
}

export function CycleTypeBadge({ type, className, children }: CycleTypeBadgeProps) {
  return (
    <Badge 
      variant="secondary"
      className={cn(
        typography.badge,
        "flex-shrink-0",
        cycleTypeBadgeVariants[type],
        className
      )}
    >
      {children}
    </Badge>
  );
}

export function ConfidenceBadge({ level, className, children }: ConfidenceBadgeProps) {
  return (
    <Badge 
      variant="secondary"
      className={cn(
        typography.badge,
        "flex-shrink-0",
        confidenceBadgeVariants[level],
        className
      )}
    >
      {children}
    </Badge>
  );
}

export function RelationshipBadge({ type, className, children }: RelationshipBadgeProps) {
  return (
    <Badge 
      variant="outline"
      className={cn(
        typography.badge,
        "flex-shrink-0 font-medium",
        relationshipBadgeVariants[type],
        className
      )}
    >
      {children}
    </Badge>
  );
}

export function FeatureBadge({ type, className, children }: FeatureBadgeProps) {
  return (
    <Badge 
      variant={type === 'beta' ? 'default' : 'outline'}
      className={cn(
        typography.badge,
        "flex-shrink-0 font-medium",
        featureBadgeVariants[type],
        className
      )}
    >
      {children}
    </Badge>
  );
} 