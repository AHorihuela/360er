# Enterprise Multi-Tenancy - Tasks

**Last Updated**: 2026-01-04 01:30

## Phase 1: Setup & Audit

- [x] Create git worktree for enterprise-readiness branch
- [x] Fix TypeScript errors (1 error fixed)
- [x] Configure enterprise Supabase with different ports
- [x] Pull testing DB schema to local Supabase
- [x] Create seed.sql with test organization data
- [x] Verify build passes

## Phase 2: Test Infrastructure (Next Priority)

- [ ] Fix `TIER_LIMITS` mock export in test setup
- [ ] Add missing Supabase env vars to test configuration
- [ ] Fix toast mock expectations
- [ ] Get test suite to 100% passing

## Phase 3: Local Development Verification

- [x] Start dev server (`npm run dev` on port 5174)
- [x] Create test user via signup (test@test.com / test123!)
- [x] Link test user to organization (Acme Corporation)
- [x] Verify login works with multi-tenant context
- [x] Master view mode working (see all orgs' data)
- [ ] Test organization switching UI (no switcher exists yet)
- [x] Verify RLS policies work correctly

## Phase 4: Feature Audit (Manual Testing)

- [ ] Organization creation flow
- [ ] Team member invitation
- [ ] Role-based access control (RBAC)
- [ ] Dashboard with org context
- [ ] Review cycle creation (org-scoped)
- [ ] Employee management (org-scoped)
- [ ] Billing/Stripe integration
- [ ] Audit logging

## Phase 5: Resume Implementation

- [ ] Fix any broken features identified in audit
- [ ] Complete remaining multi-tenancy features
- [ ] Add organization switcher to UI
- [ ] Implement SSO/WorkOS integration
- [ ] Add usage metering for billing

## Notes

### Test Failures Summary (68 failing)
```
- EmployeesPage tests: Mock issues with TIER_LIMITS
- SubscriptionManager tests: Toast mock expectations
- Various: Missing Supabase env vars
```

### Quick Start Commands
```bash
# Terminal 1: Enterprise Supabase
cd 360er/360er-enterprise
supabase start

# Terminal 2: Enterprise Dev Server
cd 360er/360er-enterprise
npm run dev  # Runs on port 3001
```

### After Creating Test User
Run this SQL in Studio (http://127.0.0.1:55323) or via psql:
```sql
-- Get user ID first
SELECT id FROM auth.users WHERE email = 'test@test.com';

-- Then run with the actual user ID:
INSERT INTO organization_members (organization_id, user_id, role, joined_at, can_manage_billing)
VALUES ('00000000-0000-0000-0000-000000000001', '<USER_ID>', 'owner', NOW(), true);

INSERT INTO user_roles (user_id, role)
VALUES ('<USER_ID>', 'master');

-- Create manager-reviewee assignments
WITH member AS (
  SELECT id FROM organization_members
  WHERE user_id = '<USER_ID>'
  AND organization_id = '00000000-0000-0000-0000-000000000001'
)
INSERT INTO manager_reviewee_assignments (organization_id, manager_id, reviewee_id, assigned_at)
SELECT '00000000-0000-0000-0000-000000000001', m.id, r.id, NOW()
FROM member m, reviewees r
WHERE r.organization_id = '00000000-0000-0000-0000-000000000001';

-- Link review cycles to user (REQUIRED for Review Cycles page to work)
UPDATE review_cycles
SET user_id = '<USER_ID>',
    created_by_user_id = '<USER_ID>'
WHERE organization_id = '00000000-0000-0000-0000-000000000001';
```

### Current Test User
- Email: test@test.com
- User ID: f0fb76e7-50e1-47e2-a791-613281a77685
- Organization: Acme Corporation (00000000-0000-0000-0000-000000000001)
- Role: owner + master
