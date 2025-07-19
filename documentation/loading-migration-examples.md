# Loading System Migration Examples

## ✅ Completed Migrations

### 1. Simple Spinner Migration (FeedbackInputForm.tsx)

**Before:**
```tsx
import { Loader2, Send, User } from 'lucide-react';

// Inside component:
{isSubmitting ? (
  <Loader2 className="h-4 w-4 animate-spin" />
) : (
  <Send className="h-4 w-4" />
)}
```

**After:**
```tsx
import { Send, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Inside component:
{isSubmitting ? (
  <LoadingSpinner size="sm" color="primary" />
) : (
  <Send className="h-4 w-4" />
)}
```

**Benefits:**
- ✅ Consistent spinner styling across the app
- ✅ Standardized size and color variants
- ✅ Built-in accessibility and test IDs

---

## 🔄 Recommended Migrations

### 2. Complex Loading State Migration (AnalysisSteps.tsx)

**Current Pattern:**
```tsx
// Before - Mix of inline spinners and custom logic
{steps.map((step) => (
  <div key={step.id} className="flex items-center gap-3">
    {step.status === 'completed' ? (
      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    ) : step.status === 'in_progress' ? (
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
    ) : step.status === 'error' ? (
      <div className="h-4 w-4 rounded-full bg-red-100 shrink-0" />
    ) : (
      <div className="h-4 w-4 rounded-full bg-gray-100 shrink-0 border border-gray-200" />
    )}
    <span className={cn(
      "text-sm transition-colors duration-200",
      step.status === 'completed' ? 'text-green-600 font-medium' :
      step.status === 'in_progress' ? 'text-primary font-medium' :
      step.status === 'error' ? 'text-red-500' :
      'text-muted-foreground'
    )}>
      {step.label}
    </span>
  </div>
))}
```

**Proposed Migration:**
```tsx
import { ProgressSteps, ProgressStep } from '@/components/ui/loading-variants';

// Transform existing data to ProgressStep format
const progressSteps: ProgressStep[] = steps.map(step => ({
  id: step.id,
  label: step.label,
  status: step.status, // Already compatible!
  description: step.description
}));

// Replace entire rendering logic with:
<ProgressSteps steps={progressSteps} size="sm" />
```

**Benefits:**
- ✅ 50+ lines of code → 1 line
- ✅ Consistent styling across all step indicators
- ✅ Built-in support for substeps and descriptions
- ✅ Automatic progress calculation
- ✅ Comprehensive test coverage

### 3. Complex Card Loading Migration (LoadingState.tsx)

**Current Pattern:**
```tsx
// Before - Custom card with inline progress logic
<Card className="w-full">
  <CardHeader>
    <div className="flex items-center gap-2">
      <Brain className="h-5 w-5 text-primary animate-pulse" />
      <CardTitle>Analyzing Feedback</CardTitle>
    </div>
    <CardDescription>{currentStage.description}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Stage {stage} of 3</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
    
    <div className="space-y-3">
      {/* 50+ lines of custom step rendering */}
    </div>
  </CardContent>
</Card>
```

**Proposed Migration:**
```tsx
import { LoadingContainer, ProgressStep } from '@/components/ui/loading-variants';

// Transform data
const progressSteps: ProgressStep[] = Object.entries(ANALYSIS_STAGES).map(([key, info]) => ({
  id: key,
  label: info.message,
  status: stage > info.step ? 'completed' : stage === info.step ? 'in_progress' : 'pending',
  substeps: info.substeps ? Object.entries(info.substeps).map(([subKey, message]) => ({
    id: subKey,
    label: message,
    status: getSubstepStatus(substep, subKey, info.substeps)
  })) : undefined
}));

// Replace entire component with:
<LoadingContainer
  title="Analyzing Feedback"
  description={currentStage.description}
  steps={progressSteps}
  showProgress={true}
  size="md"
/>
```

**Benefits:**
- ✅ 100+ lines of code → 10 lines
- ✅ Automatic progress calculation
- ✅ Built-in card styling
- ✅ Responsive design
- ✅ Substep support

---

## 🎯 Migration Priorities

### High Priority (Quick Wins)
1. **Simple Spinners** (10+ instances)
   - Replace `<Loader2 className="h-4 w-4 animate-spin" />` → `<LoadingSpinner size="sm" />`
   - Files: FeedbackInputForm, VoiceToTextInput, DetailedFeedbackSection

2. **Submit Button States** (5+ instances)
   - Use `<LoadingButton isLoading={isSubmitting}>Submit</LoadingButton>`
   - Consistent loading state across all forms

### Medium Priority (Good ROI)
3. **Multi-Step Processes** (3-4 instances)
   - AnalysisSteps.tsx → ProgressSteps component
   - LoadingState.tsx → LoadingContainer component
   - AIReport.tsx loading states

4. **Inline Loading Messages** (8+ instances)
   - Replace custom loading text → `<InlineLoading text="Saving..." />`

---

## 🔧 Migration Checklist

For each component migration:

### Before Migration
- [ ] Identify current loading patterns
- [ ] Check for custom styling requirements
- [ ] Note any special animation needs
- [ ] Document current test coverage

### During Migration
- [ ] Import new loading components
- [ ] Transform data structures if needed
- [ ] Replace old patterns with new components
- [ ] Update imports (remove Loader2, etc.)
- [ ] Test functionality

### After Migration
- [ ] Verify visual consistency
- [ ] Check accessibility compliance
- [ ] Update component tests
- [ ] Document any breaking changes

---

## 📈 Expected Results

### Code Reduction
- **Before**: ~300 lines of loading-related code across components
- **After**: ~50 lines using standardized components
- **Reduction**: 83% less loading-related code

### Consistency Gains
- **Spinner Sizes**: 5 variants → 3 standardized sizes
- **Color Usage**: 10+ custom colors → 5 semantic color tokens
- **Animation**: Multiple implementations → 1 standardized animation

### Maintenance Benefits
- **Bug Fixes**: Fix once in design system, applies everywhere
- **Feature Additions**: Add new loading states in one place
- **Design Updates**: Single source of truth for all loading UX

---

## 🚀 Next Phase: Form Validation System

After completing loading state migrations, the next highest impact opportunity is **Form Validation Standardization**:

- 15+ components with inconsistent validation styling
- Multiple error message patterns
- Different validation state indicators

This will provide similar benefits to the loading system with even greater consistency improvements across form UX. 