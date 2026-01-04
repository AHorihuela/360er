# Enterprise Multi-Tenancy - Context Document

**Last Updated**: 2026-01-03 19:45

## Overview

Resuming work on the `enterprise-readiness` branch to add multi-tenant capabilities to 360er. This branch has 355 files changed (~73k lines) compared to main.

## Key Decisions Made

### 1. Continue on Enterprise Branch (Not Cherry-Pick)
After audit, decided to continue on enterprise branch because:
- Only 1 TypeScript error (fixed)
- 91% tests passing (68/798 failing, mostly mock issues)
- Full multi-tenant schema already implemented
- RLS policies comprehensive and working

### 2. Separate Local Supabase Instances
- **Main branch**: Port 54321 (single-tenant)
- **Enterprise branch**: Port 55321 (multi-tenant)
- Allows parallel development without conflicts

## Current Architecture

### Database Schema (Testing DB: `apwhdpqsifessytazlzp`)
- `organizations` - Multi-tenant root table
- `organization_members` - Users linked to orgs with RBAC roles
- `organization_invitations` - Team invite system
- `departments` - Hierarchical org structure
- `reviewees` - People being reviewed (org-scoped)
- `manager_reviewee_assignments` - Manager-to-reviewee relationships
- `audit_logs` - Full audit trail

### Key Files
- `src/hooks/useOrganization.ts` - Zustand store for org context
- `src/types/organization.ts` - Type definitions with RBAC
- RLS migrations in `supabase/migrations/`

### RLS Policy Pattern
Two-tiered access:
1. Managers see their own data (`created_by_user_id = auth.uid()`)
2. Owners/Admins see all org data

## Environment Setup

### Enterprise Worktree
```
Location: /Users/Alberto-Fubo/Dropbox (Personal)/Programming/360er/360er-enterprise
Branch: enterprise-readiness
```

### Enterprise Local Supabase
- API: http://127.0.0.1:55321
- Studio: http://127.0.0.1:55323
- DB: postgresql://postgres:postgres@127.0.0.1:55322/postgres

### Test Credentials
- User: `test@test.com` / `test123!`
- Organization: "Test Organization" (slug: test-org)

## Session History

### 2026-01-03: Initial Audit & Setup
- Created git worktree for enterprise branch
- Fixed single TypeScript error in `src/pages/analytics/index.tsx`
- Configured separate Supabase ports (55xxx series)
- Pulled testing DB schema via `supabase db dump`
- Created seed.sql with test organization
- Build passes, local Supabase running

## Blockers/Questions

1. **Test failures** - 68 tests failing due to:
   - Missing `TIER_LIMITS` export in mocks
   - Missing Supabase env vars in test setup
   - Toast mock expectations
   - These are test infrastructure issues, not code bugs

2. **User linking** - After creating test user, need to manually run SQL to link to org

## Reference Links

- Plan file: `/Users/Alberto-Fubo/.claude/plans/curried-strolling-swing.md`
- Testing DB project: `apwhdpqsifessytazlzp`
- Production DB project: `vwckinhujlyviulpmtjo`
