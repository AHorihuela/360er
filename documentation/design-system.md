# Design System Documentation

## Overview

This project uses a hybrid approach to styling that combines the benefits of utility-first CSS (Tailwind) with centralized design tokens and component variants.

## Architecture

### 1. Design Tokens (`src/styles/design-tokens.ts`)

Centralized source of truth for:
- Colors (status, neutral, metrics)
- Spacing (cards, badges, layout)
- Typography (sizes, weights, variants)

### 2. Component Variants (`src/components/ui/badge-variants.tsx`)

Reusable components for common UI patterns:
- `StatusBadge` - for review cycle status
- `CycleTypeBadge` - for review cycle types

### 3. Utility Classes

For one-off styling and layout adjustments.

## Usage Guidelines

### ✅ Use Component Variants For:
- Repeated UI patterns (badges, buttons, cards)
- Elements with multiple states/variants
- Components that need consistent styling across the app

```tsx
// ✅ Good - using component variant
<StatusBadge status="active">Active</StatusBadge>

// ❌ Avoid - inline styling for repeated patterns
<Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
```

### ✅ Use Design Tokens For:
- Creating new component variants
- Ensuring color/spacing consistency
- Theming and design system updates

```tsx
// ✅ Good - using design tokens
import { getStatusColorClasses, typography } from "@/styles/design-tokens";

const buttonClasses = cn(
  typography.badge,
  getStatusColorClasses('active'),
  "px-4 py-2"
);
```

### ✅ Use Utility Classes For:
- Layout (flexbox, grid, positioning)
- One-off adjustments
- Responsive design
- Component-specific styling

```tsx
// ✅ Good - utilities for layout and specific adjustments
<div className="flex items-center justify-between gap-3 p-4">
  <StatusBadge status="active">Active</StatusBadge>
</div>
```

## Benefits

1. **Consistency**: Centralized tokens ensure uniform styling
2. **Maintainability**: Easy to update design system globally
3. **Reusability**: Component variants reduce code duplication
4. **Performance**: Only used styles are included in build
5. **Developer Experience**: Clear patterns and IntelliSense support
6. **Flexibility**: Can still use utilities for custom cases

## Migration Strategy

When refactoring existing components:

1. **Identify repeated patterns** (like status badges)
2. **Extract to component variants** with design tokens
3. **Replace inline classes** with component usage
4. **Keep utilities** for layout and one-off styles

## Examples

### Before (Inline Styling)
```tsx
<Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 text-xs">
  Active
</Badge>
```

### After (Component Variant)
```tsx
<StatusBadge status="active">Active</StatusBadge>
```

This approach provides the best of both worlds: systematic consistency where needed and utility flexibility where appropriate. 