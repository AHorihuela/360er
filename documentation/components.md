# Reusable Components Documentation

This document serves as a catalog of reusable components across the application. Each component is documented with its purpose, props, and usage examples.

## 🎨 Design System Components (PREFERRED)

**IMPORTANT**: Always use these unified design system components instead of creating inline implementations. This ensures consistency, maintainability, and accessibility across the application.

### Loading System Components
**Location**: `src/components/ui/loading-variants.tsx`

#### LoadingSpinner
**Purpose**: Unified spinner component replacing all `Loader2` instances.
**Usage**: 
```typescript
import { LoadingSpinner } from '@/components/ui/loading-variants';

// Replace: <Loader2 className="h-4 w-4 animate-spin" />
<LoadingSpinner size="sm" color="primary" />
```

**Props**:
- `size`: "xs" | "sm" | "md" | "lg"
- `color`: "primary" | "muted"

#### LoadingButton
**Purpose**: Button with integrated loading state, replacing inline loading implementations.
**Usage**:
```typescript
import { LoadingButton } from '@/components/ui/loading-variants';

// Replace manual loading button implementations
<LoadingButton
  isLoading={isSubmitting}
  loadingText="Saving..."
  disabled={!isValid}
  onClick={handleSubmit}
>
  Submit
</LoadingButton>
```

**Props**:
- `isLoading`: boolean
- `loadingText`: string
- `size`: "sm" | "default" | "lg" | "icon"
- Standard button props

#### LoadingContainer
**Purpose**: Complex loading scenarios with progress steps and descriptions.
**Usage**:
```typescript
import { LoadingContainer } from '@/components/ui/loading-variants';

<LoadingContainer
  title="Processing Data"
  description="Analyzing feedback and generating insights..."
  steps={progressSteps}
  showProgress={true}
  size="md"
/>
```

#### InlineLoading
**Purpose**: Simple text + spinner combinations.
**Usage**:
```typescript
import { InlineLoading } from '@/components/ui/loading-variants';

// Replace: <Loader2 className="..." /><span>Loading...</span>
<InlineLoading text="Loading questions..." size="sm" color="primary" />
```

### Progress System Components

#### ProgressSteps
**Purpose**: Step-by-step progress visualization with status indicators.
**Usage**:
```typescript
import { ProgressSteps } from '@/components/ui/loading-variants';

const steps: ProgressStep[] = [
  { id: 'step1', label: 'Processing', status: 'completed' },
  { id: 'step2', label: 'Analyzing', status: 'in_progress' },
  { id: 'step3', label: 'Finalizing', status: 'pending' }
];

<ProgressSteps steps={steps} layout="vertical" showDescriptions={true} />
```

#### StatusIcon
**Purpose**: Individual status indicators with proper styling and animations.
**Status Types**: 'pending' | 'in_progress' | 'completed' | 'error' | 'cancelled'

### Error Handling Components

#### ErrorMessage
**Purpose**: Unified inline error text, replacing inconsistent text-destructive patterns.
**Usage**:
```typescript
import { ErrorMessage } from '@/components/ui/loading-variants';

// Replace: <p className="text-destructive">{error}</p>
<ErrorMessage message={errorText} size="sm" />
```

**Props**:
- `message`: string
- `size`: "sm" | "md"

#### ErrorContainer
**Purpose**: Prominent error states with consistent styling and icons.
**Usage**:
```typescript
import { ErrorContainer } from '@/components/ui/loading-variants';

// Replace: <div className="p-4 border border-red-500 rounded">Error: ...</div>
<ErrorContainer 
  title="Configuration Error"
  message="Unable to load survey questions"
  variant="error"
  showIcon={true}
/>
```

**Props**:
- `title?`: string
- `message`: string
- `variant`: "error" | "warning" | "info" 
- `showIcon`: boolean

#### ErrorState
**Purpose**: Full page/section error states with action buttons.
**Usage**:
```typescript
import { ErrorState } from '@/components/ui/loading-variants';

<ErrorState
  title="Something went wrong"
  message="Unable to load data. Please try again."
  action={<Button onClick={retry}>Retry</Button>}
/>
```

#### FieldError
**Purpose**: Form field validation errors with consistent styling.
**Usage**:
```typescript
import { FieldError } from '@/components/ui/loading-variants';

<FieldError error={fieldErrors.email} />
<FieldError error={["Email is required", "Email must be valid"]} />
```

### 📊 Competency System

**IMPORTANT**: The application uses a comprehensive 7-competency system defined in `src/lib/competencies.ts`:

1. **Technical/Functional Expertise** - Role-specific skills and knowledge
2. **Leadership & Influence** - Taking initiative and guiding others  
3. **Collaboration & Communication** - Teamwork and communication skills
4. **Innovation & Problem-Solving** - Creative thinking and problem resolution
5. **Execution & Accountability** - Getting things done reliably
6. **Emotional Intelligence & Culture Fit** - EQ and cultural alignment
7. **Growth & Development** - Learning and development mindset

**Key Features**:
- **Shows ALL competencies** - Even those without AI scores display as "Not assessed"
- **AI Mapping** - Simple AI competency names automatically map to comprehensive system
- **Evidence Support** - Displays supporting quotes when available
- **Confidence Indicators** - Shows assessment confidence levels

### 🎨 UI/UX Improvements

**Header Hierarchy Simplification**:
- **Removed redundant headers** in 360 review report generation
- **Before**: "Generate Report" → "AI-Generated Report" → "Performance Summary" 
- **After**: "Generate Report" → "AI Report" (clean, single hierarchy)
- **Implementation**: Use `hideHeader={true}` on AIReport when embedded in sections

**Enhanced Button Styling**:
- **Large, prominent Generate Report buttons** using `size="lg"`
- **Consistent LoadingButton usage** with proper loading states
- **Clear visual hierarchy** with proper spacing and grouping
- **Professional appearance** following design system patterns

## 🚫 DEPRECATED PATTERNS (DO NOT USE)

These patterns are inconsistent and should be replaced with unified design system components:

### ❌ Loading Patterns (Use Loading Components Instead)
```typescript
// DON'T: Inline spinners
<Loader2 className="h-4 w-4 animate-spin" />

// DON'T: Custom loading buttons
{isLoading ? <LoaderIcon /> : "Submit"}

// DON'T: Inconsistent loading containers  
<div className="flex items-center gap-2">
  <Loader2 className="h-5 w-5 animate-spin" />
  <span>Loading...</span>
</div>
```

### ❌ Error Patterns (Use Error Components Instead)
```typescript
// DON'T: Inconsistent error text
<p className="text-destructive">{error}</p>
<span className="text-red-500">{error}</span>
<div className="text-red-600 font-medium">{error}</div>

// DON'T: Custom error containers
<div className="p-4 border border-red-500 rounded">
  Error: {message}
</div>

// DON'T: Inconsistent error states
<div className="text-center text-red-500">
  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
  <p>{error}</p>
</div>
```

**✅ Use These Instead:**
```typescript
// DO: Use design system components
<LoadingSpinner size="sm" color="primary" />
<LoadingButton isLoading={isLoading} loadingText="Processing...">Submit</LoadingButton>
<LoadingContainer title="Processing" steps={steps} />
```

## 📋 Migration Checklist

When creating new components or updating existing ones:

- [ ] ✅ Use `LoadingSpinner` instead of `Loader2`
- [ ] ✅ Use `LoadingButton` for buttons with loading states
- [ ] ✅ Use `LoadingContainer` for complex multi-step processes
- [ ] ✅ Use `InlineLoading` for simple text + spinner combinations
- [ ] ✅ Follow size and color conventions from design tokens
- [ ] ✅ Handle loading states at component level through props
- [ ] ✅ Test loading states in unit tests
- [ ] ✅ Ensure accessibility with proper ARIA labels

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