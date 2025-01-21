# Reusable Components Documentation

This document serves as a catalog of reusable components across the application. Each component is documented with its purpose, props, and usage examples.

## UI Components

### CompetencyCard
**Location**: `src/components/analytics/CompetencyAnalysis/components/CompetencyCard.tsx`
**Purpose**: Displays detailed information about a single competency.
**Features**:
- Displays average score with a progress bar
- Shows confidence level with detailed metrics
- Visualizes score distribution
- Shows breakdown of feedback sources
- Displays supporting evidence quotes

**Props**:
```typescript
interface CompetencyCardProps {
  name: string;
  scores: CompetencyScore[];
  description?: string;
}
```

**Usage Example**:
```tsx
<CompetencyCard
  name="Technical Skills"
  scores={competencyScores}
  description="Ability to apply technical knowledge effectively"
/>
```

### ScoreDistribution
**Location**: `src/components/analytics/CompetencyAnalysis/components/ScoreDistribution.tsx`
**Purpose**: Visualizes the distribution of scores for a competency.

## Analytics Components

### CompetencyAnalysis
**Location**: `src/components/analytics/CompetencyAnalysis/index.tsx`
**Purpose**: Main container for competency analysis visualization.
**Features**:
- Displays team coverage metrics
- Shows competency scores and distributions
- Handles relationship filtering
- Calculates confidence metrics

**Props**:
```typescript
interface CompetencyAnalysisProps {
  feedbackRequests: FeedbackRequest[];
  title?: string;
  subtitle?: string;
  showTeamStats?: boolean;
  filters?: CompetencyFilters;
}
```

### AnalyticsSummary
**Location**: `src/components/analytics/AnalyticsSummary/index.tsx`
**Purpose**: Provides a high-level summary of analytics data.

## Hooks

### useConfidenceMetrics
**Location**: `src/components/analytics/CompetencyAnalysis/hooks/useConfidenceMetrics.ts`
**Purpose**: Calculates confidence metrics for competency scores.
**Features**:
- Calculates evidence quantity
- Assesses relationship coverage
- Evaluates score consistency
- Determines distribution quality

**Usage Example**:
```typescript
const confidence = useConfidenceMetrics(scores);
console.log(confidence.level); // 'high', 'medium', or 'low'
```

### useAIReportManagement
**Location**: `src/hooks/useAIReportManagement.ts`
**Purpose**: Manages AI report generation and state.
**Features**:
- Handles report generation steps
- Manages generation state
- Provides report update functionality

### useFeedbackManagement
**Location**: `src/hooks/useFeedbackManagement.ts`
**Purpose**: Manages feedback state and operations.
**Features**:
- Handles feedback deletion
- Manages feedback state
- Provides feedback update functionality

### useFeedbackSubmission
**Location**: `src/hooks/useFeedbackSubmission.ts`
**Purpose**: Manages feedback submission process.

### useFeedbackFormState
**Location**: `src/hooks/useFeedbackFormState.ts`
**Purpose**: Manages feedback form state and validation.

## Protected Components

### ProtectedRoute
**Location**: `src/components/ProtectedRoute.tsx`
**Purpose**: Route wrapper that handles authentication and authorization.

## Best Practices for Component Reuse

1. **Check This Document First**: Before creating a new component, check if a similar one exists here.
2. **Update Documentation**: When creating new reusable components, add them to this document.
3. **Maintain Consistency**: Use existing components when possible to maintain UI consistency.
4. **Component Location**: Place reusable components in appropriate directories:
   - Generic UI components: `src/components/ui/`
   - Feature-specific components: `src/components/<feature>/`
   - Shared hooks: `src/hooks/`

## Recently Added Components

This section tracks recently added components that should be considered for reuse:

1. CompetencyCard (Added: Jan 21, 2024)
2. ScoreDistribution (Added: Jan 21, 2024)
3. AnalyticsSummary (Added: Jan 21, 2024)

## Component Roadmap

Components planned for development:

1. Feedback Form Components
2. Report Generation Components
3. Dashboard Widgets

## Directory Structure

```
src/
├── components/
│   ├── ui/           # Shadcn UI components
│   ├── analytics/    # Analytics components
│   ├── competency/   # Competency components
│   ├── dashboard/    # Dashboard components
│   ├── employee-review/
│   ├── layout/
│   ├── account/
│   ├── feedback/
│   ├── review-cycle/
│   ├── reviews/
│   └── auth/
└── hooks/           # Shared hooks
``` 