# Project Structure

```
.
├── src/
│   ├── components/     # React components
│   │   ├── FeedbackViz.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── account/
│   │   ├── auth/
│   │   ├── employee-review/
│   │   ├── feedback/
│   │   ├── layout/
│   │   ├── review-cycle/
│   │   ├── reviews/
│   │   └── ui/
│   ├── constants/
│   │   └── feedback.ts
│   ├── features/
│   ├── hooks/         # Custom React hooks
│   │   ├── useAnalysisSteps.ts
│   │   ├── useAuth.ts
│   │   ├── useFeedbackFormState.test.ts
│   │   ├── useFeedbackFormState.ts
│   │   ├── useFeedbackPreSubmissionAnalysis.ts
│   │   ├── useFeedbackSubmission.ts
│   │   ├── useSuggestionFiltering.test.ts
│   │   └── useSuggestionFiltering.ts
│   ├── lib/          # Shared libraries
│   │   ├── competencies.ts
│   │   ├── openai.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/        # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── account/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── feedback/
│   │   └── reviews/
│   ├── scripts/
│   │   ├── audit-policies.ts
│   │   └── check-drafts.ts
│   ├── server/
│   │   ├── api/
│   │   └── index.ts
│   ├── types/        # TypeScript types
│   │   ├── database.ts
│   │   ├── feedback/
│   │   ├── feedback.ts
│   │   ├── html2pdf.d.ts
│   │   └── review.ts
│   └── utils/        # Helper functions
│       ├── feedback.ts
│       └── feedbackValidation.ts
├── supabase/        # Database migrations and types
│   ├── config.toml
│   ├── functions/
│   │   ├── _shared/
│   │   └── analyze-feedback/
│   └── migrations/
│       ├── 20240101_backup_feedback_responses.sql
│       ├── 20240106_create_analyze_feedback_function.sql
│       ├── 20240130000001_consolidated_schema.sql
│       ├── 20240231000001_add_feedback_response_status.sql
│       ├── 20240232000001_policy_backup_before_recursion_fix.sql
│       ├── 20240232000002_restore_feedback_policies.sql
│       ├── 20240232000003_fix_feedback_deletion.sql
│       ├── 20240232000004_deprecate_unused_tables.sql
│       ├── 20240239000001_cleanup_deprecated_tables.sql
│       ├── 20240320000001_account_management.sql
│       ├── 20240321000001_fix_account_deletion.sql
│       └── 20241231003445_create_feedback_analytics.sql
├── public/          # Static assets
│   ├── favicon.svg
│   ├── feedback-icon.svg
│   └── vite.svg
├── documentation/   # Project documentation
│   ├── database.md
│   ├── tree_structure.md
│   └── Quantitative_Feedback_Analytics_Framew.md
├── dist/           # Built assets
└── components.json  # Shadcn UI configuration
```

## Key Directories

- `src/`: Contains all source code
  - `components/`: React components
  - `hooks/`: Custom React hooks
  - `lib/`: Shared libraries
  - `pages/`: Page components
  - `types/`: TypeScript types
  - `utils/`: Helper functions
- `supabase/`: Database migrations and types
- `public/`: Static assets
- `documentation/`: Project documentation
- `dist/`: Built assets