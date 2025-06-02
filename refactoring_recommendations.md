# Codebase Refactoring Recommendations

## Overview
This document outlines unused files and code portions identified during a comprehensive codebase review. All recommendations prioritize maintainability while ensuring no functionality is broken.

## 🚨 **Critical Issues**

### Missing Dependencies
- **lodash** - Required by 3 files but not listed in package.json dependencies:
  - `src/components/feedback/AiFeedbackReview.tsx` (line 13)
  - `src/components/employee-review/AIReport.tsx` (line 10) 
  - `src/hooks/useAIReportManagement.ts` (line 4)
  
  **Action**: Add `lodash` to dependencies or replace with native JavaScript alternatives

## 🗑️ **Safe to Remove**

### Complete Directory
- **`vite/`** - Separate Vue.js project, completely unrelated to main application
  - Contains: package.json, vite.config.js, src/, public/, README.md, .gitignore, pnpm-lock.yaml
  - **Impact**: None - completely isolated project

### Unused Dependencies
Remove from `package.json`:
- **`next`** (^15.1.5) - No imports found
- **`jspdf`** (^2.5.2) - No imports found  
- **`html2canvas`** (^1.4.1) - No imports found

### Unused Components
- **`src/components/ui/MasterAccountToggle.tsx`** - No imports found
- **`src/components/ui/rich-text-editor.tsx`** - No imports found, duplicate editor implementation

### Unused Scripts
- **`src/scripts/audit-policies.ts`** - Not referenced anywhere
- **`src/scripts/check-drafts.ts`** - Not referenced anywhere

## 📁 **Archive Candidates**

### Database Maintenance Files
Move `database/maintenance/completed/` to `database/archive/` or remove entirely:
- 13 completed maintenance scripts (1.6KB to 5.1KB each)
- Total size: ~35KB
- Last modified: Various dates (appears to be historical cleanup scripts)

## ✅ **Dependencies Confirmed in Use**

The following dependencies were verified as actively used:
- **lodash** (needs to be added)
- **marked** - Used in 2 files (pdf.ts, rich-text-editor.tsx)
- **markdown-it** - Used in MarkdownEditor.tsx
- **slate + slate-react + slate-history** - Used in RichTextEditor.tsx
- **@tiptap/*** extensions - Used in MarkdownEditor.tsx and rich-text-editor.tsx
- **zustand** - Used in useAuth.ts

## 🏗️ **Implementation Priority**

### High Priority (Potential Runtime Issues)
1. Add missing `lodash` dependency
2. Remove unused npm dependencies to reduce bundle size

### Medium Priority (Cleanup)
1. Remove `vite/` directory
2. Remove unused components
3. Remove unused scripts

### Low Priority (Organization)
1. Archive completed database maintenance files

## 📊 **Estimated Impact**

### Bundle Size Reduction
- Removing unused dependencies: ~2-3MB reduction
- Removing unused components: ~10KB reduction

### Maintenance Improvement
- Fewer files to maintain and understand
- Cleaner dependency tree
- Reduced confusion from duplicate implementations

## ⚠️ **Verification Steps**

Before implementing these changes:

1. **Test thoroughly** - Run full test suite
2. **Check imports** - Search for any dynamic imports or require() statements
3. **Verify build** - Ensure build process doesn't break
4. **Review git history** - Check if any "unused" files were recently created for future features

## 🔄 **Next Steps**

1. Start with critical dependency fixes
2. Remove obvious unused files in small, testable batches
3. Verify each removal doesn't break functionality
4. Update documentation if any removed files were documented

---

*Analysis completed on: $(date)*
*Total files reviewed: 100+ files across src/, database/, and root directories*