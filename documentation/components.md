# Reusable Components Documentation

This document serves as a catalog of reusable components across the application. Each component is documented with its purpose, props, and usage examples.

## UI Components

### CompetencySummaryCard
**Location**: `src/components/dashboard/CompetencySummaryCard.tsx`
**Purpose**: Displays a summary view of a competency with score and confidence metrics.
**Features**:
- Shows weighted average score
- Displays confidence level
- Shows evidence count
- Expandable for detailed view
- Handles outlier indicators

**Props**:
```typescript
interface CompetencySummaryCardProps {
  score: ScoreWithOutlier;
  isExpanded: boolean;
  onToggle: () => void;
}
```

### CompetencyDetails
**Location**: `src/components/dashboard/CompetencyDetails.tsx`
**Purpose**: Shows detailed analysis of a competency when expanded.
**Features**:
- Score distribution visualization
- Relationship breakdown
- Evidence quotes display
- Team score comparison
- Outlier analysis

**Props**:
```typescript
interface CompetencyDetailsProps {
  score: ScoreWithOutlier & { teamScores: ScoreWithOutlier[] };
  feedbackRequests: DashboardFeedbackRequest[];
}
```

### ScoreDistributionCard
**Location**: `src/components/dashboard/cards/ScoreDistributionCard.tsx`
**Purpose**: Visualizes the distribution of scores for a competency.
**Features**:
- Bar chart visualization
- Score frequency display
- Response count summary
- Distribution analysis

## Analytics Components

### CompetencyAnalysis
**Location**: `src/components/competency/CompetencyAnalysis.tsx`
**Purpose**: Main container for competency analysis visualization.
**Features**:
- Team-wide competency analysis
- Relationship-based filtering
- Employee filtering
- Statistical outlier detection
- Confidence calculation
- Evidence aggregation

**Props**:
```typescript
interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  title?: string;
  subtitle?: string;
  showTeamStats?: boolean;
  filters?: CompetencyFilters;
}
```

### TeamSummaryStats
**Location**: `src/components/dashboard/TeamSummaryStats.tsx`
**Purpose**: Provides team-level analytics summary.
**Features**:
- Employee coverage metrics
- Review completion stats
- Evidence distribution
- Confidence aggregation
- Team-wide score analysis

## Hooks

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

1. CompetencySummaryCard (Added: Jan 30, 2024)
2. CompetencyDetails (Added: Jan 30, 2024)
3. ScoreDistributionCard (Added: Jan 30, 2024)
4. TeamSummaryStats (Added: Jan 30, 2024)

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
│   ├── competency/   # Competency components
│   ├── dashboard/    # Dashboard components
│   │   ├── cards/    # Card components
│   ├── employee-review/
│   ├── layout/
│   ├── account/
│   ├── feedback/
│   ├── review-cycle/
│   ├── reviews/
│   └── auth/
└── hooks/           # Shared hooks
``` 